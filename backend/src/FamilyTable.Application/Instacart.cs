using System.Text.Json.Serialization;
using FamilyTable.Domain;
using MediatR;
namespace FamilyTable.Application;

// Instacart Developer Platform "Create shopping list page" request (POST /idp/v1/products/products_link).
// Instacart turns this into a page where the user picks a store, adds the items to their cart and checks out.
public sealed record InstacartMeasurement([property:JsonPropertyName("quantity")] decimal Quantity,[property:JsonPropertyName("unit")] string Unit);
public sealed record InstacartLineItem([property:JsonPropertyName("name")] string Name,[property:JsonPropertyName("display_text")] string DisplayText,[property:JsonPropertyName("line_item_measurements")] List<InstacartMeasurement> LineItemMeasurements);
public sealed record InstacartLandingPage([property:JsonPropertyName("partner_linkback_url"),JsonIgnore(Condition=JsonIgnoreCondition.WhenWritingNull)] string? PartnerLinkbackUrl);
public sealed record InstacartShoppingListRequest(
 [property:JsonPropertyName("title")] string Title,
 [property:JsonPropertyName("link_type")] string LinkType,
 [property:JsonPropertyName("line_items")] List<InstacartLineItem> LineItems,
 [property:JsonPropertyName("landing_page_configuration"),JsonIgnore(Condition=JsonIgnoreCondition.WhenWritingNull)] InstacartLandingPage? LandingPageConfiguration);
public sealed record InstacartLink(string Url);
public interface IInstacartClient { Task<string> CreateShoppingListPage(InstacartShoppingListRequest request,CancellationToken ct); }
public sealed class InstacartUnavailableException(string message,Exception? inner=null):Exception(message,inner);

public static class InstacartShoppingList {
 // Family Table unit -> Instacart unit and the factor to multiply the amount by.
 // Units Instacart has no equivalent for (jar, box, clove...) are bought as whole packages or items,
 // and the original amount is kept in the display text so nothing is lost.
 private static readonly Dictionary<string,(string Unit,decimal Factor,bool Exact)> UnitMap=new() {
  ["each"]=("each",1,true),["cup"]=("cup",1,true),["fl oz"]=("cup",0.125m,true),["oz"]=("ounce",1,true),["lb"]=("pound",1,true),
  ["tsp"]=("teaspoon",1,true),["tbsp"]=("tablespoon",1,true),["pint"]=("pint",1,true),["quart"]=("quart",1,true),["gallon"]=("gallon",1,true),
  ["g"]=("gram",1,true),["kg"]=("kilogram",1,true),["ml"]=("milliliter",1,true),["liter"]=("liter",1,true),
  ["package"]=("package",1,true),["can"]=("can",1,true),["bunch"]=("bunch",1,true),
  ["jar"]=("package",1,false),["jug"]=("package",1,false),["box"]=("package",1,false),["container"]=("package",1,false),["bag"]=("package",1,false),
  ["slice"]=("package",1,false),["clove"]=("each",1,false) };

 public static (string Unit,decimal Quantity,bool Exact) Convert(decimal quantity,string unit) {
  if(!UnitMap.TryGetValue(unit,out var m)) return ("each",Math.Max(1,Math.Ceiling(quantity)),false);
  if(m.Exact) return (m.Unit,Math.Max(0.001m,Math.Round(quantity*m.Factor,3)),true);
  // A quarter jar of jalapeños still means buying one jar; three cloves of garlic still means one head.
  return (m.Unit,unit=="clove"?1:Math.Max(1,Math.Ceiling(quantity)),false);
 }

 public static InstacartShoppingListRequest Build(Family family,Guid listId,string? linkbackUrl) {
  var list=family.GroceryLists.SingleOrDefault(l=>l.Id==listId && !l.Archived)??throw new KeyNotFoundException("Grocery list not found.");
  var names=family.Ingredients.ToDictionary(i=>i.Id,i=>i.Name);
  var items=list.Items.Where(i=>!i.Checked && i.Quantity>0)
   .GroupBy(i=>(i.IngredientId,i.Unit))
   .Select(g=>{
    var name=names.GetValueOrDefault(g.Key.IngredientId)??"Grocery item";
    var total=g.Sum(i=>i.Quantity);
    var (unit,quantity,exact)=Convert(total,g.Key.Unit);
    var display=exact?name:$"{name} ({Amount(total)} {g.Key.Unit})";
    return new InstacartLineItem(name,display,[new InstacartMeasurement(quantity,unit)]);
   }).ToList();
  if(items.Count==0) throw new ArgumentException("Everything on this list is already checked off.");
  return new InstacartShoppingListRequest(list.Name,"shopping_list",items,string.IsNullOrWhiteSpace(linkbackUrl)?null:new InstacartLandingPage(linkbackUrl));
 }
 private static string Amount(decimal q)=>Math.Round(q,2).ToString("0.##",System.Globalization.CultureInfo.InvariantCulture);
}

public record OrderOnInstacart(Guid FamilyId,string User,Guid ListId,string? LinkbackUrl):IRequest<InstacartLink>;
public class InstacartHandler(IFamilyRepository repo,IInstacartClient instacart):IRequestHandler<OrderOnInstacart,InstacartLink> {
 public async Task<InstacartLink> Handle(OrderOnInstacart q,CancellationToken ct) {
  var family=await repo.Find(q.FamilyId,ct)??throw new KeyNotFoundException("Family not found.");
  family.RequireMember(q.User);
  var request=InstacartShoppingList.Build(family,q.ListId,q.LinkbackUrl);
  return new InstacartLink(await instacart.CreateShoppingListPage(request,ct));
 }
}
