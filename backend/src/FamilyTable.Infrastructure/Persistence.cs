using FamilyTable.Application;
using FamilyTable.Domain;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
namespace FamilyTable.Infrastructure;
public class FamilyRow { public Guid Id {get;set;} public string Code {get;set;}=""; public long Revision {get;set;} public string Payload {get;set;}=""; }
public class FamilyDb(DbContextOptions<FamilyDb> options):DbContext(options) {
 public DbSet<FamilyRow> Families=>Set<FamilyRow>();
 protected override void OnModelCreating(ModelBuilder b) { b.Entity<FamilyRow>().HasKey(x=>x.Id); b.Entity<FamilyRow>().HasIndex(x=>x.Code).IsUnique(); b.Entity<FamilyRow>().Property(x=>x.Revision).IsConcurrencyToken(); b.Entity<FamilyRow>().Property(x=>x.Payload).HasColumnType("jsonb"); }
}
public class FamilyRepository(FamilyDb db):IFamilyRepository {
 private static Family Decode(FamilyRow row)=>JsonSerializer.Deserialize<Family>(row.Payload)!;
 public async Task<Family?> Find(Guid id,CancellationToken ct) {var row=await db.Families.AsNoTracking().SingleOrDefaultAsync(x=>x.Id==id,ct);return row==null?null:Decode(row);}
 public async Task<Family?> FindByCode(string code,CancellationToken ct) {var row=await db.Families.AsNoTracking().SingleOrDefaultAsync(x=>x.Code==code,ct);return row==null?null:Decode(row);}
 public async Task<List<Family>> ForUser(string user,CancellationToken ct) { var rows=await db.Families.AsNoTracking().Where(r=>EF.Functions.JsonContains(r.Payload,JsonSerializer.Serialize(new {People=new[]{new {UserId=user}}}))).ToListAsync(ct); return rows.Select(Decode).ToList(); }
 public async Task Save(Family f,long expected,CancellationToken ct) {
  f.Revision=expected+1; var payload=JsonSerializer.Serialize(f);
  if(expected==0)db.Families.Add(new(){Id=f.Id,Code=f.JoinCode,Revision=f.Revision,Payload=payload});
  else { var changed=await db.Families.Where(x=>x.Id==f.Id && x.Revision==expected).ExecuteUpdateAsync(s=>s.SetProperty(x=>x.Code,f.JoinCode).SetProperty(x=>x.Revision,f.Revision).SetProperty(x=>x.Payload,payload),ct); if(changed!=1)throw new InvalidOperationException("Your family made a change. Refresh and try again."); }
  await db.SaveChangesAsync(ct);
 }
}
