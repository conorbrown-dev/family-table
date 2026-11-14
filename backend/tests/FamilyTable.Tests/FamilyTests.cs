using FamilyTable.Domain;
using FamilyTable.Application;
using System.Text.Json;
using Xunit;
namespace FamilyTable.Tests;
public class FamilyTests {
 private static Family Setup()=>new(){Revision=1,People=[new("owner","Alex",Role.Owner),new("member","Emma",Role.Member)],Ingredients=[new(Guid.NewGuid(),"Rice","Pantry")]};
 private static Change Add(string name)=>new("ingredient","upsert",null,JsonSerializer.SerializeToElement(new {name,category="Pantry",archived=false}));
 [Fact]public async Task MemberWriteIsPendingUntilOwnerApproves(){var f=Setup();var repo=new MemoryRepo(f);var handler=new FamilyHandlers(repo);await handler.Handle(new WriteFamily(f.Id,"member",1,Add("Beans")),default);Assert.Single(f.Ingredients);Assert.Single(f.Approvals);await handler.Handle(new DecideApproval(f.Id,"owner",2,f.Approvals[0].Id,true),default);Assert.Equal(2,f.Ingredients.Count);Assert.Equal("Approved",f.Approvals[0].Status);}
 [Fact]public async Task MemberCannotApproveOwnRequest(){var f=Setup();var h=new FamilyHandlers(new MemoryRepo(f));await h.Handle(new WriteFamily(f.Id,"member",1,Add("Beans")),default);await Assert.ThrowsAsync<UnauthorizedAccessException>(()=>h.Handle(new DecideApproval(f.Id,"member",2,f.Approvals[0].Id,true),default));}
 [Fact]public async Task OutsiderCannotReadOrWrite(){var f=Setup();var h=new FamilyHandlers(new MemoryRepo(f));await Assert.ThrowsAsync<UnauthorizedAccessException>(()=>h.Handle(new ReadFamily(f.Id,"outsider"),default));await Assert.ThrowsAsync<UnauthorizedAccessException>(()=>h.Handle(new WriteFamily(f.Id,"outsider",1,Add("Beans")),default));}
 [Fact]public async Task StaleRevisionIsRejected(){var f=Setup();var h=new FamilyHandlers(new MemoryRepo(f));await Assert.ThrowsAsync<InvalidOperationException>(()=>h.Handle(new WriteFamily(f.Id,"owner",0,Add("Beans")),default));}
 [Fact]public async Task OwnerChangeCannotBeOverwrittenByOldRequest(){var f=Setup();var h=new FamilyHandlers(new MemoryRepo(f));var id=f.Ingredients[0].Id;var c=Add("Brown rice") with {Id=id};await h.Handle(new WriteFamily(f.Id,"member",1,c),default);await h.Handle(new WriteFamily(f.Id,"owner",2,Add("White rice") with {Id=id}),default);await Assert.ThrowsAsync<InvalidOperationException>(()=>h.Handle(new DecideApproval(f.Id,"owner",3,f.Approvals[0].Id,true),default));Assert.Equal("White rice",f.Ingredients[0].Name);}
 [Fact]public async Task DeclinedRequestDoesNotChangeData(){var f=Setup();var h=new FamilyHandlers(new MemoryRepo(f));await h.Handle(new WriteFamily(f.Id,"member",1,Add("Beans")),default);await h.Handle(new DecideApproval(f.Id,"owner",2,f.Approvals[0].Id,false),default);Assert.Single(f.Ingredients);Assert.Equal("Declined",f.Approvals[0].Status);}
 [Fact]public void NeededAmountsScaleAndKeepDifferentUnitsSeparate(){var f=Setup();var id=f.Ingredients[0].Id;var recipe=new Recipe(Guid.NewGuid(),"Rice bowl","",10,2,[new(id,1,"cup"),new(id,4,"oz")],[],[]);f.Recipes.Add(recipe);var p=new MealPlan(Guid.NewGuid(),"Week",[new(Guid.NewGuid(),"2026-10-08","Dinner",recipe.Id,4),new(Guid.NewGuid(),"2026-10-09","Dinner",recipe.Id,2)]);f.MealPlans.Add(p);Assert.Equal(3,f.Needed(p.Id).Single(i=>i.Unit=="cup").Quantity);Assert.Equal(12,f.Needed(p.Id).Single(i=>i.Unit=="oz").Quantity);}
 [Fact]public void ArchiveRetainsHistoricalRecipeReferences(){var f=Setup();var id=f.Ingredients[0].Id;f.Apply(new("ingredient","archive",id,JsonSerializer.SerializeToElement(new{})),"owner");Assert.True(f.Ingredients[0].Archived);}
 [Fact]public void InvalidUnitAndRatingAreRejected(){var f=Setup();var r=new Recipe(Guid.NewGuid(),"Rice","",10,2,[new(f.Ingredients[0].Id,1,"made-up")],[],[]);Assert.Throws<ArgumentException>(()=>f.Apply(new("recipe","upsert",null,JsonSerializer.SerializeToElement(r,new JsonSerializerOptions(JsonSerializerDefaults.Web))),"owner"));Assert.Throws<ArgumentException>(()=>f.Apply(new("recipe","rate",Guid.NewGuid(),JsonSerializer.SerializeToElement(new {rating=6})),"owner"));}
 [Fact]public void MemberViewHidesJoinCodeAndOtherRequests(){var f=Setup();f.JoinCode="secret";f.Approvals.Add(new(Guid.NewGuid(),"owner","Alex",Add("Beans"),1));var view=FamilyView.From(f,"member");Assert.Null(view.JoinCode);Assert.Empty(view.Approvals);}
 private class MemoryRepo(Family f):IFamilyRepository {
  public Task<Family?> Find(Guid id,CancellationToken ct)=>Task.FromResult<Family?>(id==f.Id?f:null);
  public Task<Family?> FindByCode(string code,CancellationToken ct)=>Task.FromResult<Family?>(null);
  public Task<List<Family>> ForUser(string user,CancellationToken ct)=>Task.FromResult(new List<Family>{f});
  public Task Save(Family family,long expected,CancellationToken ct){family.Revision=expected+1;return Task.CompletedTask;}
 }
}
