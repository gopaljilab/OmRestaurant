package com.omrestaurant.service;

import com.omrestaurant.model.MenuItem;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Authoritative Server-Side 174-Dish Menu Catalog for Om Restaurant.
 * Extracted directly from official restaurant menu data.
 * All prices, categories, and station routing are strictly enforced here.
 */
@Component
public class MenuCatalog {
    private static final Map<String, MenuItem> CATALOG_BY_SLUG;
    private static final Map<String, MenuItem> CATALOG_BY_NAME;
    private static final List<MenuItem> ALL_ITEMS;

    private static void addItem(Map<String, MenuItem> bySlug, Map<String, MenuItem> byName,
                                String slug, String name, String category, String station, String price) {
        MenuItem item = new MenuItem(slug, name, category, station, new BigDecimal(price));
        bySlug.put(slug.toLowerCase().trim(), item);
        byName.put(name.toLowerCase().trim(), item);
    }

    static {
        Map<String, MenuItem> bySlug = new LinkedHashMap<>(250);
        Map<String, MenuItem> byName = new LinkedHashMap<>(250);

        addItem(bySlug, byName, "om-special", "Om Special", "Indian Main Course", "curry", "280.00");
        addItem(bySlug, byName, "paneer-toofani", "Paneer Toofani", "Indian Main Course", "curry", "240.00");
        addItem(bySlug, byName, "ragini-paneer", "Ragini Paneer", "Indian Main Course", "curry", "250.00");
        addItem(bySlug, byName, "paneer-tikka-masala", "Paneer Tikka Masala", "Indian Main Course", "tandoor", "250.00");
        addItem(bySlug, byName, "paneer-angara", "Paneer Angara", "Indian Main Course", "curry", "240.00");
        addItem(bySlug, byName, "cheese-sizzler", "Cheese Sizzler", "Indian Main Course", "curry", "320.00");
        addItem(bySlug, byName, "paneer-hungama", "Paneer Hungama", "Indian Main Course", "curry", "220.00");
        addItem(bySlug, byName, "tawa-paneer", "Tawa Paneer", "Indian Main Course", "curry", "240.00");
        addItem(bySlug, byName, "kadhai-paneer", "Kadhai Paneer", "Indian Main Course", "curry", "200.00");
        addItem(bySlug, byName, "handi-paneer", "Handi Paneer", "Indian Main Course", "curry", "200.00");
        addItem(bySlug, byName, "khoya-paneer", "Khoya Paneer", "Indian Main Course", "curry", "220.00");
        addItem(bySlug, byName, "paneer-do-pyaza", "Paneer Do Pyaza", "Indian Main Course", "curry", "220.00");
        addItem(bySlug, byName, "paneer-takatak", "Paneer Takatak", "Indian Main Course", "curry", "210.00");
        addItem(bySlug, byName, "paneer-butter-masala", "Paneer Butter Masala", "Indian Main Course", "curry", "200.00");
        addItem(bySlug, byName, "paneer-afgani", "Paneer Afgani", "Indian Main Course", "curry", "210.00");
        addItem(bySlug, byName, "shahi-paneer", "Shahi Paneer", "Indian Main Course", "curry", "180.00");
        addItem(bySlug, byName, "matar-paneer", "Matar Paneer", "Indian Main Course", "curry", "190.00");
        addItem(bySlug, byName, "paneer-lababdar", "Paneer Lababdar", "Indian Main Course", "curry", "210.00");
        addItem(bySlug, byName, "aloo-paneer", "Aloo Paneer", "Indian Main Course", "curry", "180.00");
        addItem(bySlug, byName, "malai-kofta", "Malai Kofta", "Indian Main Course", "curry", "190.00");
        addItem(bySlug, byName, "palak-paneer", "Palak Paneer", "Indian Main Course", "curry", "180.00");
        addItem(bySlug, byName, "paneer-korma", "Paneer Korma", "Indian Main Course", "curry", "220.00");
        addItem(bySlug, byName, "kaju-curry", "Kaju Curry", "Veggies & Dal Items", "curry", "280.00");
        addItem(bySlug, byName, "mix-veg", "Mix Veg.", "Veggies & Dal Items", "curry", "170.00");
        addItem(bySlug, byName, "matar-mushroom", "Matar Mushroom", "Veggies & Dal Items", "curry", "210.00");
        addItem(bySlug, byName, "mushroom-masala", "Mushroom Masala", "Veggies & Dal Items", "curry", "220.00");
        addItem(bySlug, byName, "mushroom-do-pyaza", "Mushroom Do Pyaza", "Veggies & Dal Items", "curry", "220.00");
        addItem(bySlug, byName, "kashmiri-dum-aloo", "Kashmiri Dum Aloo", "Veggies & Dal Items", "curry", "190.00");
        addItem(bySlug, byName, "aloo-dum", "Aloo Dum", "Veggies & Dal Items", "curry", "160.00");
        addItem(bySlug, byName, "dal-bukhara", "Dal Bukhara", "Veggies & Dal Items", "curry", "180.00");
        addItem(bySlug, byName, "dal-makhani", "Dal Makhani", "Veggies & Dal Items", "curry", "160.00");
        addItem(bySlug, byName, "dal-tadka", "Dal Tadka", "Veggies & Dal Items", "curry", "160.00");
        addItem(bySlug, byName, "chana-masala", "Chana Masala", "Veggies & Dal Items", "curry", "180.00");
        addItem(bySlug, byName, "aloo-jeera", "Aloo Jeera", "Veggies & Dal Items", "curry", "140.00");
        addItem(bySlug, byName, "masala-chaap-gravy", "Masala Chaap Gravy", "Chaap Specials", "curry", "190.00");
        addItem(bySlug, byName, "kadhai-chaap", "Kadhai Chaap Gravy", "Chaap Specials", "curry", "190.00");
        addItem(bySlug, byName, "malai-chaap-gravy", "Malai Chaap Gravy", "Chaap Specials", "curry", "200.00");
        addItem(bySlug, byName, "tawa-chaap", "Tawa Chaap Gravy", "Chaap Specials", "curry", "200.00");
        addItem(bySlug, byName, "chaap-korma", "Chaap Korma Gravy", "Chaap Specials", "curry", "190.00");
        addItem(bySlug, byName, "malai-chaap-tandoori", "Malai Chaap Tandoori", "Chaap Specials", "tandoor", "150.00");
        addItem(bySlug, byName, "afgani-chaap", "Afgani Chaap Tandoori", "Chaap Specials", "tandoor", "160.00");
        addItem(bySlug, byName, "banjara-chaap", "Banjara Chaap Tandoori", "Chaap Specials", "tandoor", "160.00");
        addItem(bySlug, byName, "stuff-chaap", "Stuff Chaap Tandoori", "Chaap Specials", "tandoor", "180.00");
        addItem(bySlug, byName, "pudina-chaap", "Pudina Chaap Tandoori", "Chaap Specials", "tandoor", "150.00");
        addItem(bySlug, byName, "tandoori-chaap", "Adraki Chaap Tandoori", "Chaap Specials", "tandoor", "150.00");
        addItem(bySlug, byName, "garlic-chaap", "Garlic Chaap Tandoori", "Chaap Specials", "tandoor", "150.00");
        addItem(bySlug, byName, "achari-chaap", "Achari Chaap Tandoori", "Chaap Specials", "tandoor", "160.00");
        addItem(bySlug, byName, "tandoori-chaap-2", "Lemon Chaap Tandoori", "Chaap Specials", "tandoor", "150.00");
        addItem(bySlug, byName, "atrangi-chaap", "Atrangi Chaap Tandoori", "Chaap Specials", "tandoor", "160.00");
        addItem(bySlug, byName, "tandoori-chaap-3", "Firangi Chaap Tandoori", "Chaap Specials", "tandoor", "160.00");
        addItem(bySlug, byName, "tandoori-chaap-4", "Punjabi Chaap Tandoori", "Chaap Specials", "tandoor", "160.00");
        addItem(bySlug, byName, "tandoori-chaap-5", "Tandoori Chaap (Classic)", "Chaap Specials", "tandoor", "160.00");
        addItem(bySlug, byName, "tandoori-paneer-tikka", "Tandoori Paneer Tikka", "Tandoori & Starters", "tandoor", "180.00");
        addItem(bySlug, byName, "malai-paneer-tikka", "Malai Paneer Tikka", "Tandoori & Starters", "tandoor", "190.00");
        addItem(bySlug, byName, "achari-paneer-tikka", "Achaari Paneer Tikka", "Tandoori & Starters", "tandoor", "190.00");
        addItem(bySlug, byName, "pudina-paneer-tikka", "Pudina Paneer Tikka", "Tandoori & Starters", "tandoor", "160.00");
        addItem(bySlug, byName, "garlic-paneer-tikka", "Garlic Paneer Tikka", "Tandoori & Starters", "tandoor", "170.00");
        addItem(bySlug, byName, "haryali-paneer-tikka", "Haryali Paneer Tikka", "Tandoori & Starters", "tandoor", "160.00");
        addItem(bySlug, byName, "mushroom-tikka", "Mushroom Tikka", "Tandoori & Starters", "tandoor", "200.00");
        addItem(bySlug, byName, "mushroom-tikka-2", "Malai Mushroom", "Tandoori & Starters", "tandoor", "200.00");
        addItem(bySlug, byName, "mushroom-tikka-3", "Stuff Mushroom", "Tandoori & Starters", "tandoor", "200.00");
        addItem(bySlug, byName, "tandoori-platter", "Tandoori Platter", "Tandoori & Starters", "tandoor", "240.00");
        addItem(bySlug, byName, "pao-bhaji", "Pao Bhaji", "Tandoori & Starters", "tandoor", "100.00");
        addItem(bySlug, byName, "cheese-pao-bhaji", "Cheese Pao Bhaji", "Tandoori & Starters", "tandoor", "120.00");
        addItem(bySlug, byName, "paneer-65", "Paneer 65", "Tandoori & Starters", "tandoor", "150.00");
        addItem(bySlug, byName, "veg-cutlet", "Veg Cutlets", "Tandoori & Starters", "tandoor", "140.00");
        addItem(bySlug, byName, "paneer-cutlet", "Paneer Cutlets", "Tandoori & Starters", "tandoor", "160.00");
        addItem(bySlug, byName, "kathi-roll", "Kathi Roll", "Tandoori & Starters", "tandoor", "130.00");
        addItem(bySlug, byName, "dahi-kebab", "Dahi Kebab", "Tandoori & Starters", "tandoor", "160.00");
        addItem(bySlug, byName, "hara-bhara-kebab", "Hara-Bhara Kebab", "Tandoori & Starters", "tandoor", "160.00");
        addItem(bySlug, byName, "palak-paneer-2", "Palak Paneer Kebab", "Tandoori & Starters", "tandoor", "160.00");
        addItem(bySlug, byName, "mix-pakoda", "Mix Pakoda", "Tandoori & Starters", "tandoor", "140.00");
        addItem(bySlug, byName, "paneer-pakoda", "Paneer Pakoda", "Tandoori & Starters", "tandoor", "160.00");
        addItem(bySlug, byName, "pizza-dosa", "Pizza Dosa", "South Indian Delights", "south_indian", "150.00");
        addItem(bySlug, byName, "om-special-dosa", "Om Special Dosa", "South Indian Delights", "south_indian", "150.00");
        addItem(bySlug, byName, "paneer-dosa", "Paneer Dosa", "South Indian Delights", "south_indian", "130.00");
        addItem(bySlug, byName, "mysore-masala-dosa", "Mysore Masala Dosa", "South Indian Delights", "south_indian", "120.00");
        addItem(bySlug, byName, "onion-rava-dosa", "Onion Rawa Dosa", "South Indian Delights", "south_indian", "120.00");
        addItem(bySlug, byName, "rava-dosa", "Rawa Masala Dosa", "South Indian Delights", "south_indian", "120.00");
        addItem(bySlug, byName, "rava-plain-dosa", "Rawa Plain Dosa", "South Indian Delights", "south_indian", "100.00");
        addItem(bySlug, byName, "onion-uttapam", "Onion Masala Dosa", "South Indian Delights", "south_indian", "120.00");
        addItem(bySlug, byName, "butter-masala-dosa", "Butter Masala Dosa", "South Indian Delights", "south_indian", "120.00");
        addItem(bySlug, byName, "masala-dosa", "Masala Dosa", "South Indian Delights", "south_indian", "100.00");
        addItem(bySlug, byName, "paper-dosa", "Paper Dosa", "South Indian Delights", "south_indian", "80.00");
        addItem(bySlug, byName, "paneer-uttapam", "Paneer Uttapam", "South Indian Delights", "south_indian", "130.00");
        addItem(bySlug, byName, "mix-veg-uttapam", "Mix Veg. Uttapam", "South Indian Delights", "south_indian", "110.00");
        addItem(bySlug, byName, "tomato-uttapam", "Tomato Uttapam", "South Indian Delights", "south_indian", "110.00");
        addItem(bySlug, byName, "onion-uttapam-2", "Onion Uttapam", "South Indian Delights", "south_indian", "110.00");
        addItem(bySlug, byName, "idli-sambhar", "Idli Sambhar", "South Indian Delights", "south_indian", "70.00");
        addItem(bySlug, byName, "sambhar-vada", "Sambhar Vada", "South Indian Delights", "south_indian", "80.00");
        addItem(bySlug, byName, "chilli-potato", "Chilli Potato", "Chinese, Rice & Noodles", "chinese", "100.00");
        addItem(bySlug, byName, "chilli-potato-2", "Honey Chilli Potato", "Chinese, Rice & Noodles", "chinese", "120.00");
        addItem(bySlug, byName, "honey-chilli-cauliflower", "Honey Chilli Cauliflower", "Chinese, Rice & Noodles", "chinese", "120.00");
        addItem(bySlug, byName, "tandoori-chaap-6", "Chilli Soyachaap (Dry/Gravy)", "Chinese, Rice & Noodles", "chinese", "120.00");
        addItem(bySlug, byName, "veg-manchurian", "Veg Manchurian (Dry/Gravy)", "Chinese, Rice & Noodles", "chinese", "150.00");
        addItem(bySlug, byName, "chilli-paneer", "Chilli Paneer (Dry/Gravy)", "Chinese, Rice & Noodles", "chinese", "160.00");
        addItem(bySlug, byName, "chilli-mushroom", "Chilli Mushroom (Dry/Gravy)", "Chinese, Rice & Noodles", "chinese", "150.00");
        addItem(bySlug, byName, "kurkure-spring-rolls", "Kurkure Spring Rolls", "Chinese, Rice & Noodles", "chinese", "110.00");
        addItem(bySlug, byName, "spring-rolls", "Spring Rolls", "Chinese, Rice & Noodles", "chinese", "100.00");
        addItem(bySlug, byName, "hakka-noodles", "Hakka Noodles", "Chinese, Rice & Noodles", "chinese", "130.00");
        addItem(bySlug, byName, "chilli-garlic-noodles", "Chilly Garlic Noodles", "Chinese, Rice & Noodles", "chinese", "130.00");
        addItem(bySlug, byName, "singapuri-noodles", "Singapuri Noodles", "Chinese, Rice & Noodles", "chinese", "130.00");
        addItem(bySlug, byName, "schezwan-noodles", "Schezwan Noodles", "Chinese, Rice & Noodles", "chinese", "120.00");
        addItem(bySlug, byName, "schezwan-noodles-2", "Spl. Paneer Noodles", "Chinese, Rice & Noodles", "chinese", "130.00");
        addItem(bySlug, byName, "hakka-noodles-2", "Veg Noodles", "Chinese, Rice & Noodles", "chinese", "100.00");
        addItem(bySlug, byName, "veg-fried-rice", "Veg Fried Rice", "Chinese, Rice & Noodles", "chinese", "120.00");
        addItem(bySlug, byName, "chilli-garlic-fried-rice", "Chilli Garlic Fried Rice", "Chinese, Rice & Noodles", "chinese", "120.00");
        addItem(bySlug, byName, "schezwan-fried-rice", "Schezwan Fried Rice", "Chinese, Rice & Noodles", "chinese", "120.00");
        addItem(bySlug, byName, "steamed-rice", "Steamed Rice", "Rice, Biryani & Breads", "curry", "80.00");
        addItem(bySlug, byName, "jeera-rice", "Jeera Rice", "Rice, Biryani & Breads", "curry", "90.00");
        addItem(bySlug, byName, "matar-pulao", "Matar Pulao", "Rice, Biryani & Breads", "curry", "100.00");
        addItem(bySlug, byName, "veg-pulao", "Veg Pulao", "Rice, Biryani & Breads", "curry", "120.00");
        addItem(bySlug, byName, "kashmiri-pulao", "Kashmiri Pulao", "Rice, Biryani & Breads", "curry", "130.00");
        addItem(bySlug, byName, "veg-biryani", "Veg Biryani", "Rice, Biryani & Breads", "curry", "130.00");
        addItem(bySlug, byName, "hyderabadi-dum-biryani", "Hyderabadi Dum Biryani", "Rice, Biryani & Breads", "curry", "200.00");
        addItem(bySlug, byName, "garlic-naan", "Garlic Naan", "Rice, Biryani & Breads", "tandoor", "50.00");
        addItem(bySlug, byName, "paneer-naan", "Paneer Naan", "Rice, Biryani & Breads", "tandoor", "70.00");
        addItem(bySlug, byName, "stuff-naan", "Stuff Naan", "Rice, Biryani & Breads", "tandoor", "50.00");
        addItem(bySlug, byName, "butter-naan", "Butter Naan", "Rice, Biryani & Breads", "tandoor", "40.00");
        addItem(bySlug, byName, "plain-naan", "Plain Naan", "Rice, Biryani & Breads", "tandoor", "30.00");
        addItem(bySlug, byName, "laccha-paratha", "Laccha Paratha", "Rice, Biryani & Breads", "tandoor", "35.00");
        addItem(bySlug, byName, "aloo-paratha", "Aloo Paratha", "Rice, Biryani & Breads", "tandoor", "50.00");
        addItem(bySlug, byName, "pyaaz-paratha", "Pyaaz Paratha", "Rice, Biryani & Breads", "tandoor", "50.00");
        addItem(bySlug, byName, "paneer-paratha", "Paneer Paratha", "Rice, Biryani & Breads", "tandoor", "70.00");
        addItem(bySlug, byName, "chilly-paratha", "Chilly Paratha", "Rice, Biryani & Breads", "tandoor", "50.00");
        addItem(bySlug, byName, "amritsari-kulcha", "Amritsari Kulcha", "Rice, Biryani & Breads", "tandoor", "50.00");
        addItem(bySlug, byName, "plain-roti", "Plain Roti", "Rice, Biryani & Breads", "tandoor", "10.00");
        addItem(bySlug, byName, "butter-roti", "Butter Roti", "Rice, Biryani & Breads", "tandoor", "15.00");
        addItem(bySlug, byName, "missi-roti", "Missi Roti", "Rice, Biryani & Breads", "tandoor", "30.00");
        addItem(bySlug, byName, "onion-missi-roti", "Onion Missi Roti", "Rice, Biryani & Breads", "tandoor", "40.00");
        addItem(bySlug, byName, "tomato-soup", "Cream of Tomato Soup", "Soups, Salads, Falhar & Extras", "curry", "90.00");
        addItem(bySlug, byName, "mix-veg-2", "Mix Veg Noodles Soup", "Soups, Salads, Falhar & Extras", "chinese", "100.00");
        addItem(bySlug, byName, "sweet-corn-soup", "Cream of Corn Soup", "Soups, Salads, Falhar & Extras", "curry", "90.00");
        addItem(bySlug, byName, "lemon-coriander-soup", "Lemon Coriander Soup", "Soups, Salads, Falhar & Extras", "curry", "90.00");
        addItem(bySlug, byName, "hot-sour-soup", "Hot n Sour Soup", "Soups, Salads, Falhar & Extras", "curry", "90.00");
        addItem(bySlug, byName, "manchow-soup", "Manchow Soup", "Soups, Salads, Falhar & Extras", "curry", "100.00");
        addItem(bySlug, byName, "falhar-combo", "Falhar Special Combo", "Soups, Salads, Falhar & Extras", "curry", "150.00");
        addItem(bySlug, byName, "green-salad", "Green Salad", "Soups, Salads, Falhar & Extras", "curry", "40.00");
        addItem(bySlug, byName, "onion-salad", "Onion Salad", "Soups, Salads, Falhar & Extras", "curry", "35.00");
        addItem(bySlug, byName, "russian-salad", "Russian Salad", "Soups, Salads, Falhar & Extras", "curry", "70.00");
        addItem(bySlug, byName, "kachumber-salad", "Kachumber Salad", "Soups, Salads, Falhar & Extras", "curry", "50.00");
        addItem(bySlug, byName, "greek-salad", "Greek Salad", "Soups, Salads, Falhar & Extras", "curry", "100.00");
        addItem(bySlug, byName, "sirka-onion", "Sirka Onion", "Soups, Salads, Falhar & Extras", "curry", "20.00");
        addItem(bySlug, byName, "boondi-raita", "Boondi Raita", "Soups, Salads, Falhar & Extras", "curry", "90.00");
        addItem(bySlug, byName, "mix-raita", "Mix Raita", "Soups, Salads, Falhar & Extras", "curry", "100.00");
        addItem(bySlug, byName, "pineapple-raita", "Pineapple Raita", "Soups, Salads, Falhar & Extras", "curry", "110.00");
        addItem(bySlug, byName, "mint-raita", "Mint Raita", "Soups, Salads, Falhar & Extras", "curry", "90.00");
        addItem(bySlug, byName, "plain-curd", "Plain Curd", "Soups, Salads, Falhar & Extras", "curry", "70.00");
        addItem(bySlug, byName, "roasted-papad", "Roasted Papad", "Soups, Salads, Falhar & Extras", "curry", "25.00");
        addItem(bySlug, byName, "fried-papad", "Fried Papad", "Soups, Salads, Falhar & Extras", "curry", "25.00");
        addItem(bySlug, byName, "masala-papad", "Masala Papad", "Soups, Salads, Falhar & Extras", "curry", "40.00");
        addItem(bySlug, byName, "mint-mojito", "Mint Mojito", "Beverages & Shakes", "beverage", "100.00");
        addItem(bySlug, byName, "midnight-mojito", "Midnight Mojito", "Beverages & Shakes", "beverage", "100.00");
        addItem(bySlug, byName, "blue-lagoon", "Blue Lagoon", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "pina-colada", "Pina Colada", "Beverages & Shakes", "beverage", "120.00");
        addItem(bySlug, byName, "kiwi-soda", "Kiwi Soda", "Beverages & Shakes", "beverage", "80.00");
        addItem(bySlug, byName, "pineapple-soda", "Pineapple Soda", "Beverages & Shakes", "beverage", "100.00");
        addItem(bySlug, byName, "lemon-iced-tea", "Lemon Iced Tea", "Beverages & Shakes", "beverage", "80.00");
        addItem(bySlug, byName, "jain-masala-shikanji", "Jain Masala Shikanji", "Beverages & Shakes", "beverage", "50.00");
        addItem(bySlug, byName, "masala-shikanji", "Masala Shikanji", "Beverages & Shakes", "beverage", "30.00");
        addItem(bySlug, byName, "soft-drink", "Soft Drink", "Beverages & Shakes", "beverage", "30.00");
        addItem(bySlug, byName, "hot-coffee", "Coffee (Hot)", "Beverages & Shakes", "beverage", "40.00");
        addItem(bySlug, byName, "masala-tea", "Tea", "Beverages & Shakes", "beverage", "30.00");
        addItem(bySlug, byName, "cold-coffee", "Cold Coffee", "Beverages & Shakes", "beverage", "100.00");
        addItem(bySlug, byName, "strawberry-shake", "Strawberry Shake", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "vanilla-shake", "Vanilla Shake", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "chocolate-shake", "Chocolate Shake", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "pineapple-shake", "Pineapple Shake", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "mango-shake", "Mango Shake", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "banana-shake", "Banana Shake", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "butterscotch-shake", "Butterscotch Shake", "Beverages & Shakes", "beverage", "90.00");
        addItem(bySlug, byName, "oreo-shake", "Oreo Shake", "Beverages & Shakes", "beverage", "120.00");
        addItem(bySlug, byName, "kitkat-shake", "Kitkat Shake", "Beverages & Shakes", "beverage", "120.00");
        addItem(bySlug, byName, "nutella-shake", "Nutella Shake", "Beverages & Shakes", "beverage", "140.00");

        CATALOG_BY_SLUG = Collections.unmodifiableMap(bySlug);
        CATALOG_BY_NAME = Collections.unmodifiableMap(byName);
        ALL_ITEMS = Collections.unmodifiableList(new ArrayList<>(bySlug.values()));
    }

    public Optional<MenuItem> findBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(CATALOG_BY_SLUG.get(slug.trim().toLowerCase()));
    }

    public Optional<MenuItem> findByName(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(CATALOG_BY_NAME.get(name.trim().toLowerCase()));
    }

    public Optional<MenuItem> findBySlugOrName(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        Optional<MenuItem> bySlug = findBySlug(identifier);
        if (bySlug.isPresent()) {
            return bySlug;
        }
        return findByName(identifier);
    }

    public List<MenuItem> getAllDishes() {
        return ALL_ITEMS;
    }

    public int size() {
        return ALL_ITEMS.size();
    }
}
