using FamilyTable.Domain;
using MediatR;
using System.Security.Cryptography;
using System.Text;
namespace FamilyTable.Application;
public interface IFamilyRepository {
 Task<Family?> Find(Guid id,CancellationToken ct);
 Task<Family?> FindByCode(string code,CancellationToken ct);
 Task<List<Family>> ForUser(string user,CancellationToken ct);
 Task Save(Family family,long expectedRevision,CancellationToken ct);
}
public interface IEmailSender { Task SendInvite(string email,string family,string token,CancellationToken ct); }
public sealed record FamilyView(Guid Id,string Name,string? JoinCode,long Revision,List<Person> People,List<Ingredient> Ingredients,List<Recipe> Recipes,List<GroceryList> GroceryLists,List<MealPlan> MealPlans,List<Approval> Approvals,string[] Units) {
 public static FamilyView From(Family f,string user) { var owner=f.RequireMember(user).Role==Role.Owner; return new(f.Id,f.Name,owner?f.JoinCode:null,f.Revision,f.People,f.Ingredients,f.Recipes,f.GroceryLists,f.MealPlans,owner?f.Approvals:f.Approvals.Where(a=>a.UserId==user).ToList(),Family.Units); }
}
public record ReadFamily(Guid FamilyId,string User):IRequest<FamilyView>;
public record WriteFamily(Guid FamilyId,string User,long Revision,Change Change):IRequest<FamilyView>;
public record DecideApproval(Guid FamilyId,string User,long Revision,Guid ApprovalId,bool Approve):IRequest<FamilyView>;
public class FamilyHandlers(IFamilyRepository repo):IRequestHandler<ReadFamily,FamilyView>,IRequestHandler<WriteFamily,FamilyView>,IRequestHandler<DecideApproval,FamilyView> {
 public async Task<FamilyView> Handle(ReadFamily q,CancellationToken ct) => FamilyView.From(await Get(q.FamilyId,ct),q.User);
 public async Task<FamilyView> Handle(WriteFamily q,CancellationToken ct) {
  var f=await Get(q.FamilyId,ct); var member=f.RequireMember(q.User); CheckRevision(f,q.Revision);
  if(member.Role==Role.Owner) f.Apply(q.Change,q.User);
  else { var clone=System.Text.Json.JsonSerializer.Deserialize<Family>(System.Text.Json.JsonSerializer.Serialize(f))!; clone.Apply(q.Change,q.User); f.Approvals.Add(new(Guid.NewGuid(),q.User,member.Name,q.Change.Clone(),f.Revision,Fingerprint:f.Fingerprint(q.Change))); }
  await repo.Save(f,q.Revision,ct); return FamilyView.From(f,q.User);
 }
 public async Task<FamilyView> Handle(DecideApproval q,CancellationToken ct) {
  var f=await Get(q.FamilyId,ct); f.RequireOwner(q.User); CheckRevision(f,q.Revision);
  var index=f.Approvals.FindIndex(a=>a.Id==q.ApprovalId && a.Status=="Pending"); if(index<0)throw new ArgumentException("Request already reviewed.");
  var a=f.Approvals[index];
  if(q.Approve) {
   if(a.Change.Kind=="membership") { if(!f.People.Any(p=>p.UserId==a.UserId))f.People.Add(new(a.UserId,a.Name,Role.Member)); }
   else { if(a.Fingerprint!=f.Fingerprint(a.Change))throw new InvalidOperationException("This item changed. Ask for a fresh request."); f.Apply(a.Change,a.UserId); }
  }
  f.Approvals[index]=a with {Status=q.Approve?"Approved":"Declined"}; await repo.Save(f,q.Revision,ct); return FamilyView.From(f,q.User);
 }
 private async Task<Family> Get(Guid id,CancellationToken ct) => await repo.Find(id,ct)??throw new KeyNotFoundException("Family not found.");
 private static void CheckRevision(Family f,long revision) { if(f.Revision!=revision)throw new InvalidOperationException("Your family made a change. Refresh and try again."); }
}
public static class ChangeExtensions { public static Change Clone(this Change c)=> c with {Data=c.Data.Clone()}; }
public static class Codes {
 public static string Create()=>Convert.ToHexString(RandomNumberGenerator.GetBytes(8));
 public static string Hash(string token)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
