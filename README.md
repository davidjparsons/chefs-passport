# 🌍 Chef's Passport

A lightweight browser cooking game. Spin the globe, hit **🎲 Random Country**, fly to the capital, and cook the national dish in the parliament kitchen. Every country starts red and turns green once you've cooked its dish.

**225 places** — all UN members plus Vatican City and Palestine, and (FIFA/Olympics style) teams and territories such as Chinese Taipei, Hong Kong, Puerto Rico, Greenland, Scotland and Wales.

## Play

Open `index.html` in any modern browser — no install, no build step, no graphics card needed (it's all 2D canvas and HTML/CSS).

## How to cook

- Grab ingredients from the **fridge** and **cupboards** with your floating chef's glove — watch out for ingredients that aren't in the recipe.
- Prepare each one at the right station: **sink** (wash), **frying pan** (fry), **pot on the gas** (boil), **oven** (bake), **toaster** (toast), **rice cooker** (steam).
- Put everything on the **serving plate** to finish the dish and unlock the country.
- Click the **🌍 globe picture** on the kitchen wall to leave at any time.

## Profiles

- Several chefs can share one browser — use **👥 Switch chef**.
- Dress your profile in the flag of any country you've unlocked.
- Progress is saved in your browser. Use **👥 Switch chef → 📋 Backup code** to move it to another browser or computer, and **📥 Restore** to load it.

## Editing the game

All countries, dishes, ingredients, flora and fauna live in `data.js`, one line per place. The comment at the top of that file explains the format.

## Credits

Map data: [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth) · Flags: [flagcdn.com](https://flagcdn.com) · Dish photos: Wikipedia · Built with [d3](https://d3js.org).
