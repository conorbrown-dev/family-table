using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Net.Mail;
using FamilyTable.Domain;
using FamilyTable.Application;
using FamilyTable.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
var builder=WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<FamilyDb>(o=>o.UseNpgsql(builder.Configuration.GetConnectionString("Database")));
builder.Services.AddScoped<IFamilyRepository,FamilyRepository>();
builder.Services.AddScoped<IEmailSender,SmtpEmailSender>();
builder.Services.AddMediatR(c=>{c.RegisterServicesFromAssemblyContaining<ReadFamily>();if(!string.IsNullOrWhiteSpace(builder.Configuration["MediatR:LicenseKey"]))c.LicenseKey=builder.Configuration["MediatR:LicenseKey"];});
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(o=>o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o=>{
 o.Authority=builder.Configuration["Auth:Authority"];
 o.Audience="familytable-api";
 o.RequireHttpsMetadata=!builder.Environment.IsDevelopment();
 o.MapInboundClaims=false;
});
builder.Services.AddAuthorization();
builder.Services.AddCors(c=>c.AddDefaultPolicy(p=>p.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>()??["http://localhost:8081"]).AllowAnyHeader().AllowAnyMethod()));
var app=builder.Build();
app.Use(async(ctx,next)=>{try{await next();}catch(Exception ex) when(ex is ArgumentException or UnauthorizedAccessException or KeyNotFoundException or InvalidOperationException) {
 var status=ex switch {UnauthorizedAccessException=>403,KeyNotFoundException=>404,InvalidOperationException=>409,_=>400};
 await Results.Problem(title:ex.Message,statusCode:status).ExecuteAsync(ctx);
}});
app.UseCors(); app.UseAuthentication(); app.UseAuthorization();
app.MapOpenApi();
app.MapGet("/health",()=>Results.Ok(new {status="ready"}));
var api=app.MapGroup("/api").RequireAuthorization();
string User(ClaimsPrincipal u)=>u.FindFirstValue("sub")??throw new UnauthorizedAccessException("Please sign in.");
string Name(ClaimsPrincipal u)=>u.FindFirstValue("preferred_username")??"Family member";
api.MapGet("/families",async(ClaimsPrincipal u,IFamilyRepository repo,CancellationToken ct)=>
 (await repo.ForUser(User(u),ct)).Select(f=>new FamilySummary(f.Id,f.Name,f.RequireMember(User(u)).Role))).WithName("ListFamilies");
api.MapPost("/families",async(CreateFamilyRequest req,ClaimsPrincipal u,IFamilyRepository repo,CancellationToken ct)=>{
 if(string.IsNullOrWhiteSpace(req.Name)||req.Name.Length>120)throw new ArgumentException("Give your family a name.");
 var f=new Family {Name=req.Name.Trim(),JoinCode=Codes.Create(),Ingredients=Seed.Ingredients(),People=[new(User(u),Name(u),Role.Owner)]};
 await repo.Save(f,0,ct); return FamilyView.From(f,User(u));
}).WithName("CreateFamily");
api.MapGet("/families/{id:guid}",async(Guid id,ClaimsPrincipal u,ISender sender,CancellationToken ct)=>await sender.Send(new ReadFamily(id,User(u)),ct)).WithName("GetFamily");
api.MapPost("/families/{id:guid}/changes",async(Guid id,WriteRequest req,ClaimsPrincipal u,ISender sender,CancellationToken ct)=>await sender.Send(new WriteFamily(id,User(u),req.Revision,req.Change),ct)).WithName("SaveChange");
api.MapPost("/families/{id:guid}/approvals/{approvalId:guid}",async(Guid id,Guid approvalId,DecisionRequest req,ClaimsPrincipal u,ISender sender,CancellationToken ct)=>await sender.Send(new DecideApproval(id,User(u),req.Revision,approvalId,req.Approve),ct)).WithName("DecideApproval");
api.MapPost("/join",async(JoinRequest req,ClaimsPrincipal u,IFamilyRepository repo,CancellationToken ct)=>{
 var f=await repo.FindByCode(req.Code.Trim().ToUpperInvariant(),ct)??throw new ArgumentException("That family code isn't right.");
 if(f.People.Any(p=>p.UserId==User(u)))return new JoinResult("Already joined");
 if(!f.Approvals.Any(a=>a.UserId==User(u)&&a.Change.Kind=="membership"&&a.Status=="Pending")) {
 f.Approvals.Add(new(Guid.NewGuid(),User(u),Name(u),new("membership","join",null,JsonSerializer.SerializeToElement(new{})),f.Revision)); await repo.Save(f,f.Revision,ct); }
 return new JoinResult("Join request submitted for owner approval.");
}).WithName("JoinFamily");
api.MapPost("/families/{id:guid}/invites",async(Guid id,InviteRequest req,ClaimsPrincipal u,IFamilyRepository repo,IEmailSender email,IConfiguration config,CancellationToken ct)=>{
 if(!config.GetValue("Smtp:Enabled",true)) return Results.Problem(title:"Email invitations are not configured. Use a family code to request access.",statusCode:503);
 var f=await repo.Find(id,ct)??throw new KeyNotFoundException("Family not found."); f.RequireOwner(User(u));
 var address=new MailAddress(req.Email); if(address.Address!=req.Email.Trim())throw new ArgumentException("Enter an email address.");
 var token=Codes.Create()+Codes.Create(); f.Invites.Add(new(Guid.NewGuid(),address.Address.ToLowerInvariant(),Codes.Hash(token),DateTimeOffset.UtcNow.AddDays(7)));
 await email.SendInvite(address.Address,f.Name,$"{id}:{token}",ct); await repo.Save(f,f.Revision,ct); return Results.Ok(new JoinResult("Invitation sent."));
}).WithName("InviteMember");
api.MapPost("/accept-invite",async(AcceptInviteRequest req,ClaimsPrincipal u,IFamilyRepository repo,CancellationToken ct)=>{
 var parts=req.Token.Split(':'); if(parts.Length!=2||!Guid.TryParse(parts[0],out var id))throw new ArgumentException("Invitation not found.");
 var f=await repo.Find(id,ct)??throw new ArgumentException("Invitation not found.");
 if(u.FindFirstValue("email_verified")!="true")throw new ArgumentException("Verify your email before accepting.");
 var idx=f.Invites.FindIndex(i=>i.TokenHash==Codes.Hash(parts[1])&&i.ExpiresAt>DateTimeOffset.UtcNow&&!i.Used&&i.Email==u.FindFirstValue("email")?.ToLowerInvariant());
 if(idx<0)throw new ArgumentException("This invitation expired or belongs to another email.");
 f.Invites[idx]=f.Invites[idx] with {Used=true};
 if(!f.People.Any(p=>p.UserId==User(u)))f.People.Add(new(User(u),Name(u),Role.Member));
 await repo.Save(f,f.Revision,ct);return FamilyView.From(f,User(u));
}).WithName("AcceptInvite");
api.MapPost("/families/{id:guid}/members/{userId}/role",async(Guid id,string userId,RoleRequest req,ClaimsPrincipal u,IFamilyRepository repo,CancellationToken ct)=>{
 var f=await repo.Find(id,ct)??throw new KeyNotFoundException("Family not found.");f.RequireOwner(User(u));
 var idx=f.People.FindIndex(p=>p.UserId==userId);if(idx<0)throw new ArgumentException("Member not found.");
 if(req.Role==Role.Member&&f.People[idx].Role==Role.Owner&&f.People.Count(p=>p.Role==Role.Owner)==1)throw new ArgumentException("Keep at least one owner.");
 f.People[idx]=f.People[idx] with {Role=req.Role};await repo.Save(f,f.Revision,ct);return FamilyView.From(f,User(u));
}).WithName("SetMemberRole");
api.MapPost("/families/{id:guid}/rotate-code",async(Guid id,ClaimsPrincipal u,IFamilyRepository repo,CancellationToken ct)=>{
 var f=await repo.Find(id,ct)??throw new KeyNotFoundException("Family not found."); f.RequireOwner(User(u));f.JoinCode=Codes.Create();await repo.Save(f,f.Revision,ct);return FamilyView.From(f,User(u));
}).WithName("RotateJoinCode");
api.MapGet("/families/{id:guid}/plans/{planId:guid}/needed",async(Guid id,Guid planId,ClaimsPrincipal u,IFamilyRepository repo,CancellationToken ct)=>{
 var f=await repo.Find(id,ct)??throw new KeyNotFoundException("Family not found.");f.RequireMember(User(u));return f.Needed(planId);
}).WithName("GetNeededIngredients");
if(args.Contains("--initialize")) { using var scope=app.Services.CreateScope();await scope.ServiceProvider.GetRequiredService<FamilyDb>().Database.EnsureCreatedAsync();return; }
app.Run();
public record FamilySummary(Guid Id,string Name,Role Role);
public record CreateFamilyRequest(string Name);
public record WriteRequest(long Revision,Change Change);
public record DecisionRequest(long Revision,bool Approve);
public record JoinRequest(string Code);
public record JoinResult(string Message);
public record InviteRequest(string Email);
public record AcceptInviteRequest(string Token);
public record RoleRequest(Role Role);
public class SmtpEmailSender(IConfiguration config):IEmailSender {
 public async Task SendInvite(string email,string family,string token,CancellationToken ct) {
  using var smtp=new SmtpClient(config["Smtp:Host"]??"localhost",config.GetValue("Smtp:Port",1025));
  if(config.GetValue("Smtp:UseTls",false))smtp.EnableSsl=true;
  if(!string.IsNullOrWhiteSpace(config["Smtp:Username"]))smtp.Credentials=new System.Net.NetworkCredential(config["Smtp:Username"],config["Smtp:Password"]);
  using var message=new MailMessage(config["Smtp:From"]??"hello@familytable.local",email) {Subject=$"You're invited to {family} on Family Table",Body=$"You have been invited to join {family}. Open Family Table, sign in with this email, and enter this invitation in the Family tab.\n\n{token}\n\nThis invitation lasts 7 days."};
  await smtp.SendMailAsync(message,ct);
 }
}
