using System.Text.Json;
namespace FamilyTable.Domain;
public enum Role { Owner, Member }
public sealed record Person(string UserId, string Name, Role Role);
public sealed record Ingredient(Guid Id, string Name, string Category, bool Archived = false);
public sealed record Portion(Guid IngredientId, decimal Quantity, string Unit);
public sealed record Recipe(Guid Id, string Name, string Description, int Minutes, int Servings, List<Portion> Ingredients, List<string> Instructions, Dictionary<string,int> Ratings, bool Archived = false);
public sealed record GroceryItem(Guid Id, Guid IngredientId, decimal Quantity, string Unit, bool Checked = false);
public sealed record GroceryList(Guid Id, string Name, List<GroceryItem> Items, bool Archived = false);
public sealed record Meal(Guid Id, string Date, string Slot, Guid RecipeId, int Servings);
public sealed record MealPlan(Guid Id, string Name, List<Meal> Meals, bool Archived = false);
public sealed record Change(string Kind, string Action, Guid? Id, JsonElement Data);
public sealed record Approval(Guid Id, string UserId, string Name, Change Change, long BaseRevision, string Status = "Pending", string Fingerprint = "");
public sealed record Invite(Guid Id, string Email, string TokenHash, DateTimeOffset ExpiresAt, bool Used = false);
public sealed class Family {
 public Guid Id { get; set; } = Guid.NewGuid();
 public string Name { get; set; } = "Our family";
 public string JoinCode { get; set; } = "";
 public long Revision { get; set; }
 public List<Person> People { get; set; } = [];
 public List<Ingredient> Ingredients { get; set; } = [];
 public List<Recipe> Recipes { get; set; } = [];
 public List<GroceryList> GroceryLists { get; set; } = [];
 public List<MealPlan> MealPlans { get; set; } = [];
 public List<Approval> Approvals { get; set; } = [];
 public List<Invite> Invites { get; set; } = [];
 public Person RequireMember(string user) => People.SingleOrDefault(p => p.UserId == user) ?? throw new UnauthorizedAccessException("Join this family first.");
 public void RequireOwner(string user) { if (RequireMember(user).Role != Role.Owner) throw new UnauthorizedAccessException("An owner needs to approve this."); }
 public static readonly string[] Units = ["each", "cup", "fl oz", "oz", "lb", "tsp", "tbsp", "pint", "quart", "gallon", "g", "kg", "ml", "liter", "package", "jar", "jug", "box", "container", "can", "bag", "bunch", "slice", "clove"];
 public void Apply(Change c, string user) {
  if(c.Data.ValueKind is not JsonValueKind.Object)throw new ArgumentException("Use a valid item.");
  if(c.Action == "archive" || c.Action == "restore") { SetArchived(c.Kind,c.Id ?? throw new ArgumentException("Choose an item."),c.Action == "archive"); return; }
  if(c.Action == "rate" && c.Kind == "recipe") {
   var rating=c.Data.GetProperty("rating").GetInt32(); if(rating is < 1 or > 5) throw new ArgumentException("Choose 1 to 5 stars.");
   var recipe=Recipes.Single(r=>r.Id==c.Id && !r.Archived); recipe.Ratings[user]=rating; return;
  }
  if(c.Action == "check" && c.Kind == "grocery") {
   var list=GroceryLists.Single(l=>l.Id==c.Id && !l.Archived); var itemId=c.Data.GetProperty("itemId").GetGuid();
   var index=list.Items.FindIndex(i=>i.Id==itemId); if(index<0) throw new ArgumentException("Item not found.");
   list.Items[index]=list.Items[index] with {Checked=c.Data.GetProperty("checked").GetBoolean()}; return;
  }
  if(c.Action != "upsert") throw new ArgumentException("Unknown action.");
  var options=new JsonSerializerOptions(JsonSerializerDefaults.Web);
  switch(c.Kind) {
   case "ingredient": var i=c.Data.Deserialize<Ingredient>(options)!; NameRequired(i.Name); NameRequired(i.Category); Upsert(Ingredients,i with {Id=c.Id??Guid.NewGuid()},x=>x.Id,c.Id); break;
   case "recipe": var r=c.Data.Deserialize<Recipe>(options)!; NameRequired(r.Name); if(r.Ingredients==null||r.Instructions==null)throw new ArgumentException("Use valid ingredients and steps."); if(r.Minutes<1 || r.Servings<1) throw new ArgumentException("Time and servings must be positive."); foreach(var p in r.Ingredients) ValidatePortion(p);
    var existing=Recipes.SingleOrDefault(x=>x.Id==c.Id); Upsert(Recipes,r with {Id=c.Id??Guid.NewGuid(),Ratings=existing?.Ratings??[]},x=>x.Id,c.Id); break;
   case "grocery": var g=c.Data.Deserialize<GroceryList>(options)!; NameRequired(g.Name); if(g.Items==null)throw new ArgumentException("Use a valid list."); foreach(var item in g.Items) ValidatePortion(new(item.IngredientId,item.Quantity,item.Unit)); Upsert(GroceryLists,g with {Id=c.Id??Guid.NewGuid()},x=>x.Id,c.Id); break;
   case "plan": var m=c.Data.Deserialize<MealPlan>(options)!; NameRequired(m.Name); if(m.Meals==null)throw new ArgumentException("Use a valid plan."); foreach(var meal in m.Meals) { if(!DateOnly.TryParseExact(meal.Date,"yyyy-MM-dd",out _) || meal.Servings<1 || !new[]{"Breakfast","Lunch","Dinner","Snack"}.Contains(meal.Slot) || !Recipes.Any(r=>r.Id==meal.RecipeId&&!r.Archived)) throw new ArgumentException("Choose a date, meal, recipe and servings."); }
    Upsert(MealPlans,m with {Id=c.Id??Guid.NewGuid()},x=>x.Id,c.Id); break;
   default: throw new ArgumentException("Unknown item type.");
  }
 }
 public string Fingerprint(Change c) {
  if(c.Id==null || c.Kind=="membership")return "";
  object? target=c.Kind switch {"ingredient"=>Ingredients.SingleOrDefault(x=>x.Id==c.Id),"recipe"=>Recipes.SingleOrDefault(x=>x.Id==c.Id),"grocery"=>GroceryLists.SingleOrDefault(x=>x.Id==c.Id),"plan"=>MealPlans.SingleOrDefault(x=>x.Id==c.Id),_=>null};
  return JsonSerializer.Serialize(target);
 }
 public List<Portion> Needed(Guid planId) => MealPlans.Single(p=>p.Id==planId).Meals.SelectMany(m => { var r=Recipes.Single(r=>r.Id==m.RecipeId); return r.Ingredients.Select(i=>i with {Quantity=i.Quantity*m.Servings/r.Servings}); }).GroupBy(p=>new {p.IngredientId,p.Unit}).Select(g=>new Portion(g.Key.IngredientId,g.Sum(p=>p.Quantity),g.Key.Unit)).ToList();
 private void ValidatePortion(Portion p) { if(p.Quantity<=0 || !Units.Contains(p.Unit) || !Ingredients.Any(i=>i.Id==p.IngredientId && !i.Archived)) throw new ArgumentException("Choose an ingredient, positive amount and unit."); }
 private static void NameRequired(string? name) { if(string.IsNullOrWhiteSpace(name) || name.Length>120) throw new ArgumentException("Use a name between 1 and 120 characters."); }
 private static void Upsert<T>(List<T> list,T value,Func<T,Guid> id,Guid? target) { var index=list.FindIndex(x=>id(x)==target); if(target.HasValue && index<0) throw new ArgumentException("Item not found."); if(index<0)list.Add(value); else list[index]=value; }
 private void SetArchived(string kind,Guid id,bool archived) {
  switch(kind) { case "ingredient": var i=Ingredients.FindIndex(x=>x.Id==id); if(i<0)throw new ArgumentException("Ingredient not found."); Ingredients[i]=Ingredients[i] with {Archived=archived}; break;
  case "recipe": var r=Recipes.FindIndex(x=>x.Id==id); if(r<0)throw new ArgumentException("Recipe not found."); Recipes[r]=Recipes[r] with {Archived=archived}; break;
  case "grocery": var g=GroceryLists.FindIndex(x=>x.Id==id); if(g<0)throw new ArgumentException("List not found."); GroceryLists[g]=GroceryLists[g] with {Archived=archived}; break;
  case "plan": var p=MealPlans.FindIndex(x=>x.Id==id); if(p<0)throw new ArgumentException("Plan not found."); MealPlans[p]=MealPlans[p] with {Archived=archived}; break;
  default: throw new ArgumentException("Unknown item type."); }
 }
}
