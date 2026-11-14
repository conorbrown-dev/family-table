using FamilyTable.Domain;
namespace FamilyTable.Infrastructure;
public static class Seed {
 public static List<Ingredient> Ingredients() {
  var groups=new Dictionary<string,string[]> {
   ["Produce"]=["Avocado","Apple","Banana","Blueberries","Broccoli","Carrot","Cauliflower","Celery","Cherry tomato","Cucumber","Garlic","Ginger","Green beans","Kale","Lemon","Lime","Lettuce","Mushroom","Onion","Orange","Peach","Pear","Bell pepper","Potato","Raspberry","Spinach","Strawberry","Sweet potato","Tomato","Zucchini","Cabbage","Corn","Asparagus","Eggplant","Grapes","Watermelon","Pineapple","Mango","Basil","Cilantro","Parsley","Rosemary","Thyme","Scallion","Jalapeño","Pumpkin","Squash","Beet","Radish"],
   ["Dairy & eggs"]=["Milk","Butter","Egg","Greek yogurt","Cheddar","Mozzarella","Parmesan","Cream cheese","Sour cream","Heavy cream","Cottage cheese","Feta","Half and half"],
   ["Meat & seafood"]=["Chicken breast","Chicken thigh","Ground beef","Ground turkey","Bacon","Pork chop","Sausage","Salmon","Shrimp","Tuna","Turkey","Steak","Cod","Ham"],
   ["Pantry"]=["Rice","Pasta","Flour","Sugar","Brown sugar","Rolled oats","Quinoa","Couscous","Bread","Tortilla","Black beans","Chickpeas","Lentils","Kidney beans","Peanut butter","Almond butter","Olive oil","Vegetable oil","Vinegar","Soy sauce","Honey","Maple syrup","Tomato sauce","Tomato paste","Chicken broth","Vegetable broth","Coconut milk","Salt","Black pepper","Paprika","Cumin","Cinnamon","Chili powder","Oregano","Baking powder","Baking soda","Vanilla extract","Chocolate chips","Almond","Walnut","Pecan","Raisin","Cracker","Breadcrumb","Mustard","Ketchup","Mayonnaise"],
   ["Frozen"]=["Frozen peas","Frozen corn","Frozen berries","Frozen spinach","Ice cream"],
   ["Plant based"]=["Tofu","Tempeh","Oat milk","Almond milk","Nutritional yeast"],
   ["Drinks"]=["Coffee","Tea","Orange juice","Apple juice","Sparkling water"] };
  var common=groups.SelectMany(g=>g.Value.Select(name=>new Ingredient(Guid.NewGuid(),name,g.Key))).ToList();
  using var stream=typeof(Seed).Assembly.GetManifestResourceStream("FamilyTable.Infrastructure.Data.usda-foods.json")!;
  var usda=System.Text.Json.JsonSerializer.Deserialize<List<Ingredient>>(stream,new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))!;
  return common.Concat(usda).DistinctBy(i=>i.Name.ToLowerInvariant()).ToList();
 }
}
