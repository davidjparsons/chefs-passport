// One line per country or team (territories and home nations count too, FIFA/Olympics style):
// ID (ISO numeric, so it can colour the map) | flag code | Name | Capital | lat | lon | National dish | ingredients | Flora | Fauna | optional note
//   | optional Wikipedia page title for the finished-dish photo (when searching by dish name finds the wrong picture)
// Places without their own outline on the map (e.g. Scotland, Réunion) show as a clickable dot.
// Ingredient suffix = where it must be prepared:
//   :w sink (wash)  :f pan (fry)  :b pot on the gas (boil)  :o oven (bake)
//   :t toaster (toast)  :r rice cooker (steam)  (none) straight onto the plate
const COUNTRY_DATA = `
004|af|Afghanistan|Kabul|34.53|69.17|Kabuli Pulao|rice:r,lamb:f,carrot:w,raisins,onion:f|Tulip|Snow Leopard
008|al|Albania|Tirana|41.33|19.82|Tavë Kosi|lamb:o,yogurt,egg,rice:r,garlic:f|Red Poppy|Golden Eagle
012|dz|Algeria|Algiers|36.75|3.06|Couscous|couscous:b,lamb:b,carrot:w,chickpeas:b,zucchini:w|Iris|Fennec Fox
020|ad|Andorra|Andorra la Vella|42.51|1.52|Trinxat|potato:b,cabbage:b,bacon:f,garlic:f|Narcissus|Pyrenean Chamois
024|ao|Angola|Luanda|-8.84|13.23|Muamba de Galinha|chicken:f,palm oil,okra:w,garlic,chili:w|Baobab|Giant Sable Antelope
028|ag|Antigua and Barbuda|St. John's|17.12|-61.85|Fungee and Pepperpot|cornmeal:b,okra:w,spinach:w,saltfish:b,eggplant:f|Dagger Log|Fallow Deer
032|ar|Argentina|Buenos Aires|-34.6|-58.38|Asado|beef:f,chorizo:f,chimichurri,bread:t|Ceibo|Rufous Hornero
051|am|Armenia|Yerevan|40.18|44.51|Khorovats|pork:f,tomato:f,eggplant:f,lavash:t,onion|Apricot Blossom|Armenian Mouflon
036|au|Australia|Canberra|-35.28|149.13|Meat Pie|beef mince:f,pastry:o,onion:f,gravy,tomato sauce|Golden Wattle|Kangaroo
040|at|Austria|Vienna|48.21|16.37|Wiener Schnitzel|veal:f,breadcrumbs,egg,flour,lemon:w|Gentian|Black Eagle
031|az|Azerbaijan|Baku|40.41|49.87|Dolma|grape leaves:w,lamb mince:f,rice:r,yogurt,mint:w|Khari Bulbul|Karabakh Horse
044|bs|Bahamas|Nassau|25.05|-77.35|Conch Salad|conch:w,tomato:w,onion,lime:w,bell pepper:w|Yellow Elder|Flamingo
048|bh|Bahrain|Manama|26.23|50.59|Machboos|rice:r,chicken:f,tomato:w,loomi,onion:f|Tree of Life|Arabian Gazelle
050|bd|Bangladesh|Dhaka|23.81|90.41|Shorshe Ilish|hilsa fish:f,mustard paste,turmeric,green chili:w,rice:r|Water Lily|Bengal Tiger
052|bb|Barbados|Bridgetown|13.1|-59.62|Cou-Cou and Flying Fish|cornmeal:b,okra:w,flying fish:f,lime:w,onion|Pride of Barbados|Green Monkey
112|by|Belarus|Minsk|53.9|27.57|Draniki|potato:f,onion,egg,flour,sour cream|Flax|European Bison
056|be|Belgium|Brussels|50.85|4.35|Moules-Frites|mussels:b,potato:f,white wine,garlic,mayonnaise|Red Poppy|Lion
084|bz|Belize|Belmopan|17.25|-88.77|Rice and Beans|rice:r,kidney beans:b,coconut milk,chicken:o,plantain:f|Black Orchid|Baird's Tapir
204|bj|Benin|Porto-Novo|6.5|2.6|Pâte with Gboma Dessi|cornmeal:b,spinach:w,tomato:w,fish:f,palm oil|Oil Palm|Leopard
064|bt|Bhutan|Thimphu|27.47|89.64|Ema Datshi|chili:w,cheese,onion,tomato:w,red rice:r|Blue Poppy|Takin
068|bo|Bolivia|Sucre|-19.04|-65.26|Salteña|pastry:o,beef:f,potato:b,peas:b,egg:b|Kantuta|Llama
070|ba|Bosnia and Herzegovina|Sarajevo|43.86|18.41|Ćevapi|beef mince:f,lamb mince:f,somun bread:t,onion,kajmak|Golden Lily|Brown Bear
072|bw|Botswana|Gaborone|-24.63|25.92|Seswaa|beef:b,salt,maize meal:b,spinach:w|Devil's Claw|Zebra
076|br|Brazil|Brasília|-15.79|-47.88|Feijoada|black beans:b,pork:b,sausage:f,rice:r,orange:w,collard greens:f|Golden Trumpet Tree|Jaguar
096|bn|Brunei|Bandar Seri Begawan|4.9|114.94|Ambuyat|sago:b,shrimp paste,fish:f,chili:w|Simpor|Proboscis Monkey
100|bg|Bulgaria|Sofia|42.7|23.32|Shopska Salad|tomato:w,cucumber:w,bell pepper:o,onion,sirene cheese|Rose|Lion
854|bf|Burkina Faso|Ouagadougou|12.37|-1.52|Riz Gras|rice:r,beef:f,tomato:w,onion,cabbage:b|Shea Tree|White Stallion
108|bi|Burundi|Gitega|-3.43|29.93|Beans and Plantains|beans:b,plantain:f,onion,palm oil,tomato:w|Banana Plant|Lion
132|cv|Cabo Verde|Praia|14.93|-23.51|Cachupa|corn:b,beans:b,sausage:f,cabbage:b,fish:f|Dragon Tree|Grey-headed Kingfisher
116|kh|Cambodia|Phnom Penh|11.56|104.92|Fish Amok|fish:b,coconut milk,kroeung paste,banana leaf:w,egg|Romduol|Kouprey
120|cm|Cameroon|Yaoundé|3.85|11.5|Ndolé|bitterleaf:w,peanuts:b,shrimp:f,beef:b,plantain:f|Oil Palm|Lion
124|ca|Canada|Ottawa|45.42|-75.7|Poutine|potato:f,cheese curds,gravy:b|Sugar Maple|Beaver
140|cf|Central African Republic|Bangui|4.39|18.56|Gozo and Peanut Stew|cassava:b,peanut butter,okra:w,chicken:f|Baobab|African Forest Elephant
148|td|Chad|N'Djamena|12.13|15.05|Boule|millet:b,okra:w,tomato:w,beef:f|Acacia|Addax||Ugali
152|cl|Chile|Santiago|-33.45|-70.67|Pastel de Choclo|corn:b,beef mince:f,onion:f,olives,egg:b,chicken:o|Copihue|Huemul
156|cn|China|Beijing|39.9|116.4|Peking Duck|duck:o,pancakes:b,cucumber:w,spring onion:w,hoisin sauce|Peony|Giant Panda
170|co|Colombia|Bogotá|4.71|-74.07|Bandeja Paisa|beans:b,rice:r,pork belly:f,egg:f,avocado,plantain:f|Christmas Orchid|Andean Condor
174|km|Comoros|Moroni|-11.7|43.26|Langouste à la Vanille|lobster:b,vanilla,butter,rice:r|Ylang-ylang|Coelacanth
178|cg|Congo|Brazzaville|-4.27|15.28|Poulet Moambé|chicken:f,palm butter,tomato:w,rice:r,chili|Oil Palm|Western Lowland Gorilla
180|cd|DR Congo|Kinshasa|-4.32|15.31|Pondu and Fufu|cassava leaves:w,cassava flour:b,fish:f,palm oil,onion|Ebony Tree|Okapi
188|cr|Costa Rica|San José|9.93|-84.09|Gallo Pinto|rice:r,black beans:b,onion:f,bell pepper:f,egg:f,salsa lizano|Guaria Morada Orchid|Sloth
384|ci|Côte d'Ivoire|Yamoussoukro|6.83|-5.29|Attiéké and Fish|cassava couscous:b,tilapia:o,tomato:w,onion,chili|Iroko Tree|African Elephant
191|hr|Croatia|Zagreb|45.81|15.98|Peka|lamb:o,potato:o,carrot:w,rosemary,olive oil|Croatian Iris|Dalmatian Dog||Sač
192|cu|Cuba|Havana|23.11|-82.37|Ropa Vieja|beef:b,tomato:w,bell pepper:f,onion:f,rice:r|Butterfly Jasmine|Cuban Trogon
196|cy|Cyprus|Nicosia|35.17|33.36|Souvla with Halloumi|pork:o,halloumi:f,pita:t,tomato:w,lemon|Cyclamen|Mouflon
203|cz|Czechia|Prague|50.08|14.43|Svíčková|beef:o,cream,carrot:b,dumplings:b,cranberries|Linden Tree|Double-tailed Lion
208|dk|Denmark|Copenhagen|55.68|12.57|Smørrebrød|rye bread:t,herring,egg:b,butter,dill:w|Marguerite Daisy|Mute Swan
262|dj|Djibouti|Djibouti|11.59|43.15|Skoudehkaris|rice:r,lamb:f,tomato:w,cardamom,onion|Acacia|Beira Antelope
212|dm|Dominica|Roseau|15.3|-61.39|Callaloo Soup|dasheen leaves:w,coconut milk,okra:w,crab:b,onion|Bwa Kwaib|Sisserou Parrot
214|do|Dominican Republic|Santo Domingo|18.49|-69.93|La Bandera|rice:r,red beans:b,chicken:f,lettuce:w,plantain:f|Bayahibe Rose|Palmchat
218|ec|Ecuador|Quito|-0.18|-78.47|Encebollado|tuna:b,cassava:b,onion,lime:w,tomato:w|Cinchona Tree|Andean Condor
818|eg|Egypt|Cairo|30.04|31.24|Koshari|rice:r,lentils:b,macaroni:b,tomato sauce,onion:f,chickpeas:b|Lotus|Steppe Eagle
222|sv|El Salvador|San Salvador|13.69|-89.22|Pupusas|masa:f,cheese,refried beans,curtido cabbage:w,tomato sauce|Izote|Torogoz
226|gq|Equatorial Guinea|Malabo|3.75|8.78|Pepper Soup|fish:b,chili,tomato:w,onion,plantain:f|Silk Cotton Tree|Western Gorilla
232|er|Eritrea|Asmara|15.32|38.93|Zigni with Injera|beef:b,berbere,onion:f,injera:f,tomato:w|Olive Tree|Dromedary Camel
233|ee|Estonia|Tallinn|59.44|24.75|Mulgipuder|potato:b,barley:b,pork:f,onion:f|Cornflower|Barn Swallow
748|sz|Eswatini|Mbabane|-26.31|31.14|Sishwala and Stew|maize meal:b,beef:b,tomato:w,onion|Fire Lily|Lion
231|et|Ethiopia|Addis Ababa|9.03|38.74|Doro Wat|chicken:b,berbere,onion:f,egg:b,injera:f|Calla Lily|Ethiopian Wolf
242|fj|Fiji|Suva|-18.14|178.44|Kokoda|fish:w,coconut milk,lime:w,chili,tomato:w|Tagimoucia|Collared Lory
246|fi|Finland|Helsinki|60.17|24.94|Karelian Pasties|rye pastry:o,rice:r,butter,egg:b|Lily of the Valley|Brown Bear
250|fr|France|Paris|48.86|2.35|Coq au Vin|chicken:f,red wine,mushrooms:f,bacon:f,baguette:t|Iris|Gallic Rooster
266|ga|Gabon|Libreville|0.42|9.47|Poulet Nyembwe|chicken:f,palm nut sauce,okra:w,garlic,rice:r|Okoumé Tree|Black Panther
270|gm|Gambia|Banjul|13.45|-16.58|Domoda|peanut butter,beef:f,tomato:w,pumpkin:b,rice:r|Oil Palm|Nile Crocodile
268|ge|Georgia|Tbilisi|41.72|44.79|Khachapuri|dough:o,cheese,egg,butter|Grapevine|Caucasian Wolf
276|de|Germany|Berlin|52.52|13.4|Bratwurst and Sauerkraut|bratwurst:f,sauerkraut:b,potato:b,mustard,pretzel:o|Cornflower|Federal Eagle
288|gh|Ghana|Accra|5.6|-0.19|Jollof Rice|rice:r,tomato:w,bell pepper:w,onion:f,chicken:o|Kapok Tree|Tawny Eagle
300|gr|Greece|Athens|37.98|23.73|Moussaka|eggplant:f,lamb mince:f,potato:b,béchamel:o,tomato:w|Acanthus|Dolphin
308|gd|Grenada|St. George's|12.06|-61.75|Oil Down|breadfruit:b,salted pork,coconut milk,dumplings:b,callaloo:w|Bougainvillea|Grenada Dove
320|gt|Guatemala|Guatemala City|14.63|-90.51|Pepián|chicken:b,tomato:o,pumpkin seeds:f,chili:f,rice:r|Monja Blanca Orchid|Resplendent Quetzal
324|gn|Guinea|Conakry|9.64|-13.58|Poulet Yassa|chicken:o,onion:f,lemon:w,mustard,rice:r|Kola Nut Tree|African Elephant
624|gw|Guinea-Bissau|Bissau|11.86|-15.6|Caldo de Mancarra|peanuts:b,chicken:f,tomato:w,rice:r|Cashew Tree|Leopard
328|gy|Guyana|Georgetown|6.8|-58.16|Pepperpot|beef:b,cassareep,cinnamon,chili,bread:t|Victoria Amazonica|Jaguar
332|ht|Haiti|Port-au-Prince|18.59|-72.31|Griot|pork:f,sour orange:w,plantain:f,pikliz,rice:r|Hibiscus|Hispaniolan Trogon
340|hn|Honduras|Tegucigalpa|14.07|-87.19|Baleada|tortilla:f,refried beans:f,cheese,cream,avocado|Rhyncholaelia Orchid|Scarlet Macaw
348|hu|Hungary|Budapest|47.5|19.04|Goulash|beef:b,paprika,onion:f,potato:b,carrot:w|Tulip|Hungarian Grey Cattle
352|is|Iceland|Reykjavík|64.15|-21.94|Plokkfiskur|cod:b,potato:b,onion:f,milk,rye bread:t|Mountain Avens|Atlantic Puffin
356|in|India|New Delhi|28.61|77.21|Butter Chicken|chicken:o,butter,tomato:w,cream,rice:r,naan:o|Lotus|Bengal Tiger
360|id|Indonesia|Jakarta|-6.21|106.85|Nasi Goreng|rice:r,egg:f,shrimp:f,kecap manis,chili,shallot|Moth Orchid|Komodo Dragon
364|ir|Iran|Tehran|35.69|51.39|Chelow Kabab|rice:r,lamb mince:f,tomato:f,saffron,butter|Tulip|Persian Cheetah
368|iq|Iraq|Baghdad|33.31|44.36|Masgouf|carp:o,tomato:w,onion,lemon:w,flatbread:t|Rose|Chukar Partridge
372|ie|Ireland|Dublin|53.35|-6.26|Irish Stew|lamb:b,potato:b,carrot:w,onion,soda bread:t|Shamrock|Irish Hare
376|il|Israel|Jerusalem|31.77|35.21|Falafel|chickpeas:f,pita:t,tomato:w,cucumber:w,tahini|Anemone|Hoopoe
380|it|Italy|Rome|41.9|12.5|Pizza Margherita|dough:o,tomato sauce,mozzarella,basil:w,olive oil|Lily|Italian Wolf
388|jm|Jamaica|Kingston|18.0|-76.79|Ackee and Saltfish|ackee:b,saltfish:b,onion:f,scotch bonnet,tomato:w|Lignum Vitae|Doctor Bird
392|jp|Japan|Tokyo|35.68|139.69|Sushi|rice:r,salmon:w,nori,cucumber:w,wasabi|Cherry Blossom|Green Pheasant
400|jo|Jordan|Amman|31.95|35.93|Mansaf|lamb:b,jameed yogurt,rice:r,flatbread:t,almonds:f|Black Iris|Arabian Oryx
398|kz|Kazakhstan|Astana|51.17|71.45|Beshbarmak|beef:b,noodles:b,onion,potato:b|Tulip|Golden Eagle
404|ke|Kenya|Nairobi|-1.29|36.82|Ugali and Sukuma Wiki|maize flour:b,kale:w,tomato,onion:f,beef:f|Orchid|Lion
296|ki|Kiribati|South Tarawa|1.45|173.0|Te Ika Mata|fish:w,coconut cream,lime:w,breadfruit:o,taro:b|Frangipani|Frigatebird
408|kp|North Korea|Pyongyang|39.04|125.76|Naengmyeon|buckwheat noodles:b,beef broth:b,cucumber:w,egg:b,pear:w|Magnolia|Siberian Tiger
410|kr|South Korea|Seoul|37.57|126.98|Bibimbap|rice:r,beef:f,spinach:w,carrot:f,egg:f,gochujang|Rose of Sharon|Korean Magpie
414|kw|Kuwait|Kuwait City|29.38|47.99|Mutabbaq Samak|fish:f,rice:r,tomato:w,onion:f,spices|Arfaj|Dromedary Camel
417|kg|Kyrgyzstan|Bishkek|42.87|74.59|Lagman|noodles:b,beef:f,bell pepper:w,tomato,garlic|Tulip|Snow Leopard
418|la|Laos|Vientiane|17.98|102.63|Larb|chicken mince:f,mint:w,lime,sticky rice:r,fish sauce|Dok Champa|Indochinese Tiger
428|lv|Latvia|Riga|56.95|24.11|Grey Peas with Bacon|grey peas:b,bacon:f,onion:f,kefir|Daisy|White Wagtail
422|lb|Lebanon|Beirut|33.89|35.5|Kibbeh|bulgur,lamb mince:f,onion:f,pine nuts:f,mint:w|Cedar Tree|Striped Hyena
426|ls|Lesotho|Maseru|-29.31|27.48|Papa and Moroho|maize meal:b,spinach:w,onion,tomato:w|Spiral Aloe|Bearded Vulture
430|lr|Liberia|Monrovia|6.3|-10.8|Palm Butter Soup|palm butter,chicken:b,fish:f,chili,rice:r|Oil Palm|Pygmy Hippo
434|ly|Libya|Tripoli|32.89|13.19|Bazeen|barley flour:b,lamb:b,tomato:w,potato:b,egg:b|Pomegranate|Barbary Sheep
438|li|Liechtenstein|Vaduz|47.14|9.52|Käsknöpfle|dumplings:b,cheese,onion:f,apple sauce|Yellow Lily|Kestrel
440|lt|Lithuania|Vilnius|54.69|25.28|Cepelinai|potato:b,pork mince:f,sour cream,bacon:f|Rue|White Stork
442|lu|Luxembourg|Luxembourg|49.61|6.13|Judd mat Gaardebounen|smoked pork:b,broad beans:b,potato:b,bacon:f|Rose|Red Lion
450|mg|Madagascar|Antananarivo|-18.88|47.51|Romazava|beef:b,leafy greens:w,tomato,onion,rice:r|Flamboyant Tree|Ring-tailed Lemur
454|mw|Malawi|Lilongwe|-13.96|33.79|Nsima and Chambo|maize flour:b,chambo fish:f,tomato:w,onion|Mulanje Cedar|Thomson's Gazelle
458|my|Malaysia|Kuala Lumpur|3.14|101.69|Nasi Lemak|rice:r,coconut milk,anchovies:f,peanuts:f,egg:b,sambal,cucumber:w|Hibiscus|Malayan Tiger
462|mv|Maldives|Malé|4.18|73.51|Garudhiya|tuna:b,rice:r,lime,chili,onion|Pink Rose|Yellowfin Tuna
466|ml|Mali|Bamako|12.64|-8.0|Tiguadege Na|peanut butter,beef:b,tomato:w,onion:f,rice:r|Baobab|Hippopotamus
470|mt|Malta|Valletta|35.9|14.51|Stuffat tal-Fenek|rabbit:b,red wine,tomato,garlic,potato:f|Maltese Centaury|Pharaoh Hound
584|mh|Marshall Islands|Majuro|7.09|171.38|Breadfruit and Coconut Fish|breadfruit:o,fish:f,coconut,rice:r|Pandanus|Green Sea Turtle
478|mr|Mauritania|Nouakchott|18.08|-15.98|Méchoui|lamb:o,couscous:b,dates,mint:w|Acacia|Dromedary Camel
480|mu|Mauritius|Port Louis|-20.16|57.5|Dholl Puri|split peas:b,flatbread:f,curry,chutney,tomato:w|Trochetia|Dodo
484|mx|Mexico|Mexico City|19.43|-99.13|Tacos al Pastor|pork:f,tortilla:f,pineapple:w,onion,cilantro:w,lime|Dahlia|Golden Eagle
583|fm|Micronesia|Palikir|6.92|158.16|Taro and Coconut Fish|taro:b,coconut milk,fish:f,breadfruit:o|Plumeria|Micronesian Pigeon
498|md|Moldova|Chișinău|47.01|28.86|Mămăligă|cornmeal:b,cheese,sour cream,egg:f,pork:f|Grapevine|Aurochs
492|mc|Monaco|Monaco|43.74|7.42|Barbajuan|pastry:f,chard:w,ricotta,parmesan,onion|Carnation|Mediterranean Monk Seal
496|mn|Mongolia|Ulaanbaatar|47.89|106.91|Buuz|mutton:f,dough:b,onion,garlic|Scabiosa|Przewalski's Horse
499|me|Montenegro|Podgorica|42.44|19.26|Kačamak|cornmeal:b,potato:b,kajmak,cheese|Mediterranean Pine|Balkan Lynx
504|ma|Morocco|Rabat|34.02|-6.84|Chicken Tagine|chicken:o,preserved lemon,olives,onion:f,couscous:b|Rose|Barbary Lion
508|mz|Mozambique|Maputo|-25.97|32.57|Piri-Piri Prawns|prawns:f,piri-piri chili,garlic,lemon:w,rice:r|Mopane Tree|Dugong
104|mm|Myanmar|Naypyidaw|19.76|96.08|Mohinga|catfish:b,rice noodles:b,lemongrass:w,banana stem,egg:b|Padauk|Green Peafowl
516|na|Namibia|Windhoek|-22.56|17.08|Kapana|beef:f,chili,tomato:w,onion,maize meal:b|Welwitschia|Gemsbok
520|nr|Nauru|Yaren|-0.55|166.92|Coconut Fish|fish:f,coconut,rice:r,lime:w|Tomano Tree|Noddy Tern
524|np|Nepal|Kathmandu|27.72|85.32|Dal Bhat|lentils:b,rice:r,spinach:w,potato:f,pickle|Rhododendron|Himalayan Monal
528|nl|Netherlands|Amsterdam|52.37|4.9|Stamppot|potato:b,kale:w,rookworst:b,butter|Tulip|Black-tailed Godwit
554|nz|New Zealand|Wellington|-41.29|174.78|Hāngī|lamb:o,kumara:o,pumpkin:o,potato:o,cabbage:w|Silver Fern|Kiwi
558|ni|Nicaragua|Managua|12.11|-86.24|Nacatamal|masa:b,pork:b,rice:r,potato:b,banana leaf:w|Sacuanjoche|Guardabarranco
562|ne|Niger|Niamey|13.51|2.11|Djerma Stew|rice:r,beef:b,tomato:w,onion,peanuts|Desert Date|Dama Gazelle
566|ng|Nigeria|Abuja|9.08|7.4|Egusi Soup|melon seeds:f,spinach:w,beef:b,palm oil,pounded yam:b|Costus|Black Crowned Crane
807|mk|North Macedonia|Skopje|41.99|21.43|Tavče Gravče|beans:b,onion:f,bell pepper:f,paprika|Poppy|Ohrid Trout
578|no|Norway|Oslo|59.91|10.75|Fårikål|lamb:b,cabbage:w,peppercorns,potato:b|Heather|Fjord Horse
512|om|Oman|Muscat|23.59|58.38|Shuwa|lamb:o,spices,rice:r,garlic|Frankincense|Arabian Oryx
586|pk|Pakistan|Islamabad|33.68|73.05|Nihari|beef:b,ginger,chili,naan:o,lemon:w|Jasmine|Markhor
585|pw|Palau|Ngerulmud|7.5|134.62|Taro and Fish|taro:b,fish:f,coconut milk,tapioca:b|Bird's Nest Fern|Palau Fruit Dove
275|ps|Palestine|Ramallah|31.9|35.2|Musakhan|chicken:o,sumac,onion:f,taboon bread:o,pine nuts:f|Faqqua Iris|Palestine Sunbird
591|pa|Panama|Panama City|8.98|-79.52|Sancocho|chicken:b,yuca:b,corn:b,cilantro:w,rice:r|Holy Ghost Orchid|Harpy Eagle
598|pg|Papua New Guinea|Port Moresby|-9.44|147.18|Mumu|pork:o,sweet potato:o,banana leaf:w,leafy greens:w,coconut milk|Dendrobium Orchid|Bird of Paradise
600|py|Paraguay|Asunción|-25.26|-57.58|Sopa Paraguaya|cornmeal:o,cheese,onion:f,egg,milk|Passion Flower|Bare-throated Bellbird
604|pe|Peru|Lima|-12.05|-77.04|Ceviche|sea bass:w,lime,red onion,chili,sweet potato:b,corn:b|Cantuta|Vicuña
608|ph|Philippines|Manila|14.6|120.98|Chicken Adobo|chicken:b,soy sauce,vinegar,garlic:f,bay leaf,rice:r|Sampaguita|Philippine Eagle
616|pl|Poland|Warsaw|52.23|21.01|Pierogi|dumplings:b,potato:b,cheese,onion:f,sour cream|Corn Poppy|White-tailed Eagle
620|pt|Portugal|Lisbon|38.72|-9.14|Bacalhau à Brás|salt cod:w,potato:f,egg:f,onion:f,olives,parsley:w|Lavender|Barcelos Rooster
634|qa|Qatar|Doha|25.29|51.53|Harees|wheat:b,lamb:b,ghee,cinnamon|Sidra Tree|Arabian Oryx
642|ro|Romania|Bucharest|44.43|26.1|Sarmale|cabbage leaves:b,pork mince:f,rice:r,tomato sauce,sour cream|Peony|Lynx
643|ru|Russia|Moscow|55.76|37.62|Pelmeni|dumplings:b,pork mince:f,onion,sour cream,dill:w|Chamomile|Brown Bear
646|rw|Rwanda|Kigali|-1.94|30.06|Isombe|cassava leaves:w,eggplant:b,peanut butter,palm oil,plantain:f|Coffee Plant|Mountain Gorilla
659|kn|Saint Kitts and Nevis|Basseterre|17.3|-62.72|Stewed Saltfish|saltfish:b,dumplings:b,breadfruit:o,coconut,plantain:f|Flamboyant Tree|Green Vervet Monkey
662|lc|Saint Lucia|Castries|14.01|-60.99|Green Fig and Saltfish|green banana:b,saltfish:b,onion:f,bell pepper:f|Rose|Saint Lucia Parrot
670|vc|Saint Vincent and the Grenadines|Kingstown|13.16|-61.22|Breadfruit and Jackfish|breadfruit:o,jackfish:f,lime:w,onion|Soufrière Tree|St Vincent Parrot
882|ws|Samoa|Apia|-13.83|-171.76|Palusami|taro leaves:o,coconut cream,onion,taro:b|Teuila|Tooth-billed Pigeon
674|sm|San Marino|San Marino|43.94|12.45|Piadina|flatbread:f,prosciutto,cheese,rocket:w|Cyclamen|Peregrine Falcon
678|st|São Tomé and Príncipe|São Tomé|0.34|6.73|Calulu|fish:b,okra:w,eggplant,palm oil,banana:f|Cocoa Tree|Grey Parrot
682|sa|Saudi Arabia|Riyadh|24.71|46.68|Kabsa|rice:r,chicken:o,tomato:w,raisins,almonds:f|Date Palm|Arabian Camel
686|sn|Senegal|Dakar|14.72|-17.47|Thieboudienne|rice:r,fish:f,tomato:w,cabbage:b,carrot:w,cassava:b|Baobab|Lion
688|rs|Serbia|Belgrade|44.79|20.45|Pljeskavica|beef mince:f,pork mince:f,onion,lepinja bread:t,ajvar|Plum Blossom|Grey Wolf
690|sc|Seychelles|Victoria|-4.62|55.45|Octopus Curry|octopus:b,coconut milk,curry,rice:r|Tropicbird Orchid|Aldabra Giant Tortoise
694|sl|Sierra Leone|Freetown|8.48|-13.23|Cassava Leaf Stew|cassava leaves:w,palm oil,chicken:f,fish:f,rice:r|Scarlet Plume|Lion
702|sg|Singapore|Singapore|1.29|103.85|Hainanese Chicken Rice|chicken:b,rice:r,cucumber:w,ginger,chili sauce|Vanda Miss Joaquim Orchid|Lion
703|sk|Slovakia|Bratislava|48.15|17.11|Bryndzové Halušky|potato dumplings:b,bryndza cheese,bacon:f|Linden Tree|Tatra Chamois
705|si|Slovenia|Ljubljana|46.05|14.51|Kranjska Klobasa|sausage:b,sauerkraut,mustard,bread:t|Carnation|Lipizzaner Horse
090|sb|Solomon Islands|Honiara|-9.43|159.95|Fish and Taro|fish:o,taro:b,coconut milk,cassava:b|Hibiscus|Saltwater Crocodile
706|so|Somalia|Mogadishu|2.05|45.32|Bariis Iskukaris|rice:r,goat:f,tomato:w,raisins,banana|Myrrh|Leopard
710|za|South Africa|Pretoria|-25.75|28.19|Bobotie|beef mince:f,curry,egg:o,chutney,rice:r|King Protea|Springbok
728|ss|South Sudan|Juba|4.85|31.58|Kisra and Mullah|kisra flatbread:f,beef:b,okra:w,peanut butter|Mahogany Tree|White-eared Kob
724|es|Spain|Madrid|40.42|-3.7|Paella|rice:r,saffron,prawns:f,chicken:f,peas:b,lemon:w|Carnation|Bull
144|lk|Sri Lanka|Sri Jayawardenepura Kotte|6.89|79.9|Rice and Curry|rice:r,dhal:b,chicken:b,coconut,curry leaves:w|Blue Water Lily|Sri Lankan Junglefowl
729|sd|Sudan|Khartoum|15.5|32.56|Ful Medames|fava beans:b,olive oil,cumin,egg:b,bread:t|Hibiscus|Secretary Bird
740|sr|Suriname|Paramaribo|5.85|-55.2|Pom|pomtajer root:o,chicken:f,orange juice,onion|Faya Lobi|Great Kiskadee
752|se|Sweden|Stockholm|59.33|18.07|Swedish Meatballs|beef mince:f,potato:b,lingonberry jam,cream|Twinflower|Moose
756|ch|Switzerland|Bern|46.95|7.45|Cheese Fondue|cheese:b,white wine,garlic,bread:t,potato:b|Edelweiss|Alpine Ibex
760|sy|Syria|Damascus|33.51|36.29|Shawarma|chicken:f,garlic sauce,pita:t,pickles,tomato:w|Damask Rose|Syrian Brown Bear
762|tj|Tajikistan|Dushanbe|38.56|68.77|Qurutob|flatbread:o,qurut,onion:f,tomato:w,cucumber:w|Mountain Tulip|Marco Polo Sheep
834|tz|Tanzania|Dodoma|-6.16|35.75|Pilau|rice:r,beef:f,potato:b,spices,onion:f|Clove Tree|Giraffe
764|th|Thailand|Bangkok|13.76|100.5|Pad Thai|rice noodles:b,shrimp:f,egg:f,peanuts,bean sprouts:w,lime|Ratchaphruek|Asian Elephant
626|tl|Timor-Leste|Dili|-8.56|125.57|Ikan Sabuco|fish:f,tamarind,tomato:w,rice:r|Sandalwood|Saltwater Crocodile
768|tg|Togo|Lomé|6.13|1.22|Fufu and Peanut Soup|yam:b,peanut butter,chicken:b,tomato:w|Teak Tree|Lion
776|to|Tonga|Nuku'alofa|-21.14|-175.2|Lu Pulu|taro leaves:o,corned beef,coconut milk,onion|Heilala|Red Shining Parrot
780|tt|Trinidad and Tobago|Port of Spain|10.66|-61.51|Doubles|bara flatbread:f,chickpeas:b,curry,tamarind sauce,cucumber:w|Chaconia|Scarlet Ibis
788|tn|Tunisia|Tunis|36.81|10.18|Brik|pastry:f,egg,tuna,parsley:w,capers|Jasmine|Barbary Deer
792|tr|Türkiye|Ankara|39.93|32.86|İskender Kebab|lamb:f,pide bread:t,tomato sauce,yogurt,butter|Tulip|Anatolian Shepherd Dog
795|tm|Turkmenistan|Ashgabat|37.96|58.33|Dograma|bread:t,lamb:b,onion,tomato:w|Pomegranate|Akhal-Teke Horse
798|tv|Tuvalu|Funafuti|-8.52|179.2|Pulaka|swamp taro:b,coconut cream,fish:f|Pandanus|White-tailed Tropicbird
800|ug|Uganda|Kampala|0.35|32.58|Matoke|green banana:b,beef:b,tomato:w,onion:f,groundnut sauce|Mvule Tree|Grey Crowned Crane
804|ua|Ukraine|Kyiv|50.45|30.52|Borscht|beetroot:b,cabbage:b,potato:b,carrot:w,sour cream,dill:w|Sunflower|Nightingale
784|ae|United Arab Emirates|Abu Dhabi|24.45|54.38|Lamb Machboos|lamb:b,rice:r,loomi,onion:f|Ghaf Tree|Falcon
826|gb|United Kingdom|London|51.51|-0.13|Fish and Chips|cod:f,potato:f,batter,peas:b,lemon:w|Oak Tree|Lion
840|us|United States|Washington, D.C.|38.9|-77.04|Cheeseburger|beef patty:f,bun:t,lettuce:w,tomato:w,cheese,pickles|Rose|Bald Eagle
858|uy|Uruguay|Montevideo|-34.9|-56.16|Chivito|steak:f,bun:t,ham,egg:f,lettuce:w,cheese|Ceibo|Southern Lapwing
860|uz|Uzbekistan|Tashkent|41.3|69.24|Plov|rice:r,lamb:f,carrot:w,chickpeas:b,garlic|Cotton Flower|Bukhara Deer
548|vu|Vanuatu|Port Vila|-17.73|168.32|Lap Lap|yam:o,coconut cream,banana leaf:w,pork:f|Namele Palm|Dugong
336|va|Vatican City|Vatican City|41.9|12.45|Saltimbocca alla Romana|veal:f,prosciutto,sage:w,white wine,butter|Madonna Lily|White Dove
862|ve|Venezuela|Caracas|10.48|-66.9|Pabellón Criollo|beef:b,black beans:b,rice:r,plantain:f|May Orchid|Troupial
704|vn|Vietnam|Hanoi|21.03|105.85|Phở|rice noodles:b,beef:b,star anise,bean sprouts:w,basil:w,lime|Lotus|Water Buffalo
887|ye|Yemen|Sana'a|15.37|44.19|Saltah|lamb:b,fenugreek,tomato:w,potato:f,flatbread:o|Dragon's Blood Tree|Arabian Leopard
894|zm|Zambia|Lusaka|-15.39|28.32|Nshima and Ifisashi|maize meal:b,leafy greens:w,peanuts:b,tomato|Bougainvillea|African Fish Eagle
716|zw|Zimbabwe|Harare|-17.83|31.05|Sadza and Nyama|maize meal:b,beef:b,tomato:w,onion:f,collard greens:w|Flame Lily|Sable Antelope
158|tw|Chinese Taipei|Taipei|25.03|121.56|Beef Noodle Soup|wheat noodles:b,beef:b,bok choy:w,star anise,chili|Plum Blossom|Formosan Black Bear|Olympic team (Taiwan)
344|hk|Hong Kong|Hong Kong|22.32|114.17|Wonton Noodles|wontons:b,egg noodles:b,choy sum:w,ginger,spring onion:w|Bauhinia|Chinese White Dolphin|Special Administrative Region of China
446|mo|Macau|Macau|22.2|113.54|Minchi|beef mince:f,potato:f,onion:f,soy sauce,egg:f,rice:r|Lotus|Black-faced Spoonbill|Special Administrative Region of China
630|pr|Puerto Rico|San Juan|18.47|-66.11|Mofongo|plantain:f,garlic,pork rinds:f,olive oil,shrimp:f|Flor de Maga|Coquí Frog|U.S. territory · own Olympic & FIFA team
254|gf|French Guiana|Cayenne|4.92|-52.33|Bouillon d'Awara|awara palm paste,chicken:b,smoked fish:f,cucumber:w,green beans:b|Awara Palm|Leatherback Turtle|Overseas region of France
304|gl|Greenland|Nuuk|64.18|-51.72|Suaasat|reindeer:b,onion,potato:b,barley:b,rice:r|Dwarf Fireweed|Polar Bear|Autonomous territory of Denmark
xk|xk|Kosovo|Pristina|42.66|21.17|Flija|batter:o,cream,butter,yogurt|Peony|Brown Bear|Olympic & FIFA member|Flia
eng|gb-eng|England|London|51.51|-0.13|Sunday Roast|beef:o,potato:o,yorkshire pudding batter:o,carrot:b,gravy|Tudor Rose|Three Lions|Home nation · own FIFA team
sco|gb-sct|Scotland|Edinburgh|55.95|-3.19|Haggis, Neeps and Tatties|haggis:o,turnip:b,potato:b,whisky sauce|Thistle|Unicorn|Home nation · own FIFA team
wal|gb-wls|Wales|Cardiff|51.48|-3.18|Cawl|lamb:b,leek:w,potato:b,carrot:w,swede:b|Daffodil|Red Dragon|Home nation · own FIFA team
nir|gb-nir|Northern Ireland|Belfast|54.6|-5.93|Ulster Fry|sausage:f,bacon:f,egg:f,soda bread:f,potato bread:f,tomato:f|Flax|Red Squirrel|Home nation · own FIFA team|Ulster fry
234|fo|Faroe Islands|Tórshavn|62.01|-6.77|Fish and Potatoes|cod:b,potato:b,butter,onion:f|Marsh Marigold|Oystercatcher|Autonomous territory of Denmark · own FIFA team|Faroese cuisine
292|gi|Gibraltar|Gibraltar|36.14|-5.35|Calentita|chickpea flour:o,olive oil,salt,peppercorns|Gibraltar Candytuft|Barbary Macaque|British Overseas Territory · own FIFA team
533|aw|Aruba|Oranjestad|12.52|-70.03|Keshi Yena|edam cheese:o,chicken:f,olives,raisins,tomato:w|Aloe|Aruban Burrowing Owl|Kingdom of the Netherlands · own Olympic & FIFA team
531|cw|Curaçao|Willemstad|12.11|-68.93|Stoba|goat:b,papaya:w,lime,rice:r|Kibrahacha Tree|Curaçao White-tailed Deer|Kingdom of the Netherlands · own FIFA team
060|bm|Bermuda|Hamilton|32.29|-64.78|Fish Chowder|fish:b,tomato:w,onion:f,sherry pepper sauce,potato:b|Bermudiana|Bermuda Cahow|British Overseas Territory · own Olympic & FIFA team
136|ky|Cayman Islands|George Town|19.29|-81.38|Cayman-style Snapper|snapper:f,onion,tomato:w,bell pepper:w,scotch bonnet|Wild Banana Orchid|Blue Iguana|British Overseas Territory · own Olympic & FIFA team
092|vg|British Virgin Islands|Road Town|18.43|-64.62|Fish and Fungi|cornmeal:b,okra:w,fish:f,tomato:w|White Cedar|Zenaida Dove|British Overseas Territory · own Olympic & FIFA team
850|vi|US Virgin Islands|Charlotte Amalie|18.34|-64.93|Kallaloo|callaloo:w,okra:w,pork:b,crab:b,fish:f|Yellow Cedar|Bananaquit|U.S. territory · own Olympic & FIFA team
016|as|American Samoa|Pago Pago|-14.28|-170.7|Oka|fish:w,coconut cream,lime:w,cucumber:w,onion|Ava Plant|Samoan Flying Fox|U.S. territory · own Olympic & FIFA team|'Ota 'ika
316|gu|Guam|Hagåtña|13.47|144.75|Chicken Kelaguen|chicken:o,lemon:w,coconut,onion,chili|Puti Tai Nobiu|Guam Rail|U.S. territory · own Olympic & FIFA team
184|ck|Cook Islands|Avarua|-21.21|-159.78|Ika Mata|fish:w,coconut cream,lime:w,tomato:w,cucumber:w|Tiare Māori|Kakerori|Self-governing in free association with New Zealand
540|nc|New Caledonia|Nouméa|-22.27|166.45|Bougna|chicken:o,yam:o,sweet potato:o,banana leaf:w,coconut milk|Araucaria|Kagu|Special collectivity of France · own FIFA team
258|pf|Tahiti|Papeete|-17.54|-149.57|Poisson Cru|tuna:w,coconut milk,lime:w,cucumber:w,carrot:w|Tiare|Humpback Whale|French Polynesia · own FIFA team
474|mq|Martinique|Fort-de-France|14.6|-61.07|Colombo|chicken:b,curry,eggplant:f,potato:b,rice:r|Balisier|Martinique Oriole|Overseas region of France
312|gp|Guadeloupe|Basse-Terre|16.0|-61.73|Bokit|dough:f,saltfish:f,lettuce:w,tomato:w|Anthurium|Guadeloupe Raccoon|Overseas region of France
638|re|Réunion|Saint-Denis|-20.88|55.45|Rougail Saucisse|sausage:f,tomato:w,onion:f,ginger,rice:r|Vanilla Orchid|Réunion Harrier|Overseas region of France
660|ai|Anguilla|The Valley|18.22|-63.05|Pigeon Peas and Rice|pigeon peas:b,rice:r,coconut milk,onion,thyme:w|Turk's Cap Cactus|Zenaida Dove|British Overseas Territory · own FIFA team
500|ms|Montserrat|Brades|16.79|-62.21|Goat Water|goat:b,breadfruit:b,onion,thyme:w,flour|Heliconia|Montserrat Oriole|British Overseas Territory · own FIFA team
796|tc|Turks and Caicos Islands|Cockburn Town|21.46|-71.14|Conch Fritters|conch:f,batter,bell pepper:w,onion,lime:w|Turk's Head Cactus|Rock Iguana|British Overseas Territory · own FIFA team
`;
