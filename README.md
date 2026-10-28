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

## Profiles, passport and leaderboard

- Several chefs can share one browser — use **👥 Switch chef**.
- Dress your profile in the flag of any country you've unlocked.
- **🛂 Passport** opens a flip-book passport: your details on the first page, then a stamp for every place you've unlocked with the date you unlocked it.
- **🏆 Leaderboard** ranks every chef in the world by places unlocked. Ties go to whoever reached that number first.
- Progress is saved in your browser and, when the leaderboard is switched on, online too. There are no passwords: **👥 Switch chef → 📋 Backup code** is your key. Paste it into **📥 Restore** on another device to carry on as the same chef. Codes from older versions still work.

## Turning on the World Leaderboard

The leaderboard uses a free [Supabase](https://supabase.com) database. Without it the game still works, and the leaderboard just shows the chefs on that device.

1. Create a free account at supabase.com and click **New project** (any name, any region; save the database password somewhere, though the game doesn't need it).
2. When it's ready, open **SQL Editor → New query**, paste everything from `supabase-setup.sql`, and click **Run**.
3. Open **Project Settings → API Keys** (or **Settings → API**) and copy the **Project URL** and the **anon / publishable** key.
4. Put them in `config.js`:
   ```js
   supabaseUrl: 'https://your-project.supabase.co',
   supabaseKey: 'your-anon-or-publishable-key',
   ```
5. Upload `config.js` to GitHub. Within a minute or two the HUD shows "☁️ Saved online".

The anon/publishable key is meant to be public. The database only lets players read the leaderboard and save chefs they hold the backup code for. The secret key (service role) must never go in `config.js`.

Because there are no accounts, a determined player could fake progress. That's fine for a fun game, but don't use it for anything with prizes.

## Editing the game

All countries, dishes, ingredients, flora and fauna live in `data.js`, one line per place. The comment at the top of that file explains the format.

## Credits

Map data: [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth) · Flags: [flagcdn.com](https://flagcdn.com) · Dish photos: Wikipedia · Built with [d3](https://d3js.org).
