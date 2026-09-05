/**
 * Dynamic Product Specification Schemas per Category
 * Fully customized category-specific field blueprint for SWEETOS tech e-commerce marketplace.
 */

export const laptopBrandSeriesMap = {
  "HP": ["EliteBook", "ProBook", "Pavilion", "Envy", "Omen", "Spectre", "ZBook"],
  "Dell": ["Latitude", "XPS", "Inspiron", "Precision", "Vostro", "Alienware"],
  "Lenovo": ["ThinkPad", "IdeaPad", "Legion", "Yoga", "ThinkBook"],
  "Apple": ["MacBook Air", "MacBook Pro"],
  "ASUS": ["ZenBook", "ROG", "TUF", "VivoBook", "ProArt"],
  "Acer": ["Aspire", "Swift", "Predator", "Nitro"],
  "MSI": ["GF Series", "Prestige", "Stealth", "Raider"],
  "Samsung": ["Galaxy Book", "Chromebook"]
};

export const productCategorySchemas = {
  // 1. LAPTOPS
  laptop: {
    label: "💻 Ordinateurs Portables (Laptops)",
    keywords: ["laptop", "ordinateur portable", "macbook", "pc portable", "notebook"],
    fields: [
      { 
        name: "Marque", 
        key: "brand",
        type: "select",
        options: ["HP", "Dell", "Lenovo", "Apple", "ASUS", "Acer", "MSI", "Samsung", "Toshiba", "Microsoft Surface", "Autre"]
      },
      { 
        name: "Gamme / Série", 
        key: "productLine",
        type: "select",
        options: [
          // HP
          "HP EliteBook", "HP ProBook", "HP Pavilion", "HP Envy", "HP Omen", "HP Spectre", "HP ZBook",
          // Dell
          "Dell Latitude", "Dell XPS", "Dell Inspiron", "Dell Precision", "Dell Vostro", "Dell Alienware",
          // Lenovo
          "Lenovo ThinkPad", "Lenovo IdeaPad", "Lenovo Legion", "Lenovo Yoga", "Lenovo ThinkBook",
          // Apple
          "MacBook Air", "MacBook Pro",
          // ASUS
          "ASUS ZenBook", "ASUS ROG", "ASUS TUF", "ASUS VivoBook",
          // Acer
          "Acer Aspire", "Acer Swift", "Acer Predator", "Acer Nitro",
          // MSI & Samsung
          "MSI Gaming", "Samsung Galaxy Book", "Autre Série"
        ]
      },
      { 
        name: "Modèle Exact", 
        key: "exactModel",
        type: "text", 
        placeholder: "Ex: EliteBook 840 G5, MacBook Pro M1, Latitude 5490..." 
      },
      { 
        name: "Processeur", 
        key: "processor",
        type: "select",
        options: [
          "Intel Core i3", "Intel Core i5", "Intel Core i7", "Intel Core i9", "Intel Celeron / Pentium", "Intel Core Ultra",
          "AMD Ryzen 3", "AMD Ryzen 5", "AMD Ryzen 7", "AMD Ryzen 9",
          "Apple M1", "Apple M1 Pro / Max", "Apple M2", "Apple M2 Pro / Max", "Apple M3", "Apple M3 Pro / Max", "Apple M4"
        ]
      },
      { 
        name: "Génération CPU", 
        key: "generation",
        type: "select",
        options: [
          "14th Gen", "13th Gen", "12th Gen", "11th Gen", "10th Gen", "9th Gen", "8th Gen", "7th Gen", "6th Gen", "Apple Silicon M-Series", "N/A"
        ]
      },
      { 
        name: "RAM", 
        key: "ram",
        type: "select",
        options: ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB"]
      },
      { 
        name: "Type de RAM", 
        key: "ramType",
        type: "select",
        options: ["DDR5", "DDR4", "DDR3", "LPDDR5", "LPDDR4", "Soudée (Soldered)"]
      },
      { 
        name: "Stockage", 
        key: "storageType",
        type: "select",
        options: ["SSD NVMe (M.2)", "SSD SATA 2.5\"", "HDD", "Hybride SSD+HDD", "eMMC"]
      },
      { 
        name: "Capacité Stockage", 
        key: "storageSize",
        type: "select",
        options: ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB"]
      },
      { 
        name: "Carte Graphique", 
        key: "gpu",
        type: "text", 
        placeholder: "Ex: Intel UHD 620, NVIDIA RTX 3060 6GB, Intel Iris Xe..." 
      },
      { 
        name: "Taille Écran", 
        key: "screenSize",
        type: "select",
        options: ["11.6\"", "12.5\"", "13.3\"", "14.0\"", "15.6\"", "16.0\"", "17.3\""]
      },
      { 
        name: "Résolution Écran", 
        key: "resolution",
        type: "select",
        options: ["HD (1366x768)", "Full HD (1080p)", "2K / QHD (1440p)", "3K / 3.2K", "4K UHD (3840x2160)", "Retina Display"]
      },
      { 
        name: "Système d'exploitation", 
        key: "os",
        type: "select",
        options: ["Windows 11 Pro", "Windows 11 Famille", "Windows 10 Pro", "Windows 10 Famille", "macOS", "ChromeOS", "Linux", "Aucun (FreeDOS)"]
      },
      { 
        name: "État de la batterie", 
        key: "batteryHealth",
        type: "select",
        options: ["Neuf 100%", "Excellente (90-100%)", "Bonne (70-89%)", "Moyenne (50-69%)", "Faible (<50%)", "Batterie Neuve Remplacée"]
      },
      { 
        name: "Accessoires Inclus", 
        key: "accessories",
        type: "text",
        placeholder: "Ex: Chargeur original, Sacoche offerte, Souris sans fil, Boîte d'origine"
      }
    ]
  },

  // 2. RAM MODULES
  ram: {
    label: "💾 Mémoire RAM",
    keywords: ["ram", "mémoire", "memoire"],
    fields: [
      { 
        name: "Type de RAM", 
        key: "ramType",
        type: "select",
        options: ["DDR5", "DDR4", "DDR3", "DDR3L", "LPDDR4", "LPDDR5"]
      },
      { 
        name: "Capacité", 
        key: "capacity",
        type: "select",
        options: ["2GB", "4GB", "8GB", "16GB", "32GB", "64GB", "128GB"]
      },
      { 
        name: "Fréquence", 
        key: "speed",
        type: "select",
        options: ["2133MHz", "2400MHz", "2666MHz", "3000MHz", "3200MHz", "3600MHz", "4000MHz+", "4800MHz", "5600MHz", "6000MHz+"]
      },
      { 
        name: "Format", 
        key: "formFactor",
        type: "select",
        options: ["DIMM (PC Bureau)", "SO-DIMM (PC Portable)"]
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "text",
        placeholder: "Corsair, Kingston, Crucial, G.Skill, Hynix, Samsung..."
      }
    ]
  },

  // 3. CABLES
  cable: {
    label: "🔌 Câbles (USB-C, HDMI, etc.)",
    keywords: ["câble", "cable", "cordon", "adaptateur cable"],
    fields: [
      { 
        name: "Type de Câble", 
        key: "cableType",
        type: "select",
        options: [
          "USB-C vers USB-C", 
          "USB-C vers USB-A", 
          "USB-C vers Lightning", 
          "Lightning (iPhone)", 
          "Micro-USB",
          "HDMI 2.1 / 2.0", 
          "DisplayPort 1.4", 
          "Ethernet RJ45 (Cat6/7/8)", 
          "Audio Jack 3.5mm",
          "VGA / DVI"
        ]
      },
      { 
        name: "Longueur", 
        key: "length",
        type: "select",
        options: ["0.5m", "1m", "1.5m", "2m", "3m", "5m+"]
      },
      { 
        name: "Puissance de Charge", 
        key: "chargingPower",
        type: "select",
        options: ["15W", "18W", "20W", "30W", "60W", "100W", "240W"]
      },
      { 
        name: "Vitesse de Données", 
        key: "dataSpeed",
        type: "select",
        options: [
          "USB 2.0 (480 Mbps)", 
          "USB 3.0/3.1 (5 Gbps)", 
          "USB 3.2 (10 Gbps)", 
          "Thunderbolt 3 (40 Gbps)", 
          "Thunderbolt 4 (40 Gbps)", 
          "Charge uniquement (pas de données)"
        ]
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "text",
        placeholder: "Anker, Baseus, Ugreen, Apple, Original..."
      }
    ]
  },

  // 4. CHARGERS & ADAPTERS
  charger: {
    label: "🔋 Chargeurs & Adaptateurs",
    keywords: ["chargeur", "charger", "powerbank", "secteur", "bloc de charge", "alimentations"],
    fields: [
      { 
        name: "Type de Chargeur", 
        key: "chargerType",
        type: "select",
        options: [
          "Mural (Prise)", 
          "Voiture (Allume-cigare)", 
          "Sans fil (Wireless / MagSafe)", 
          "Powerbank (Batterie Externe)", 
          "Station de charge USB multiple"
        ]
      },
      { 
        name: "Puissance (Watt)", 
        key: "wattage",
        type: "select",
        options: ["5W", "10W", "18W", "20W", "25W", "30W", "45W", "65W", "87W", "100W", "120W+"]
      },
      { 
        name: "Ports Disponibles", 
        key: "portsAvailable",
        type: "select",
        options: ["1x USB-C", "1x USB-A", "2x USB-C", "1x USB-C + 1x USB-A", "3x Ports USB Multiple", "4+ Ports", "Qi Wireless"]
      },
      { 
        name: "Technologie Charge Rapide", 
        key: "fastChargingTech",
        type: "select",
        options: [
          "Power Delivery (PD 3.0)", 
          "Quick Charge 3.0/4+", 
          "SuperVOOC / Warp Charge", 
          "Adaptive Fast Charging (Samsung)",
          "Charge Standard (Non rapide)"
        ]
      },
      { 
        name: "Compatibilité", 
        key: "compatibility",
        type: "text",
        placeholder: "Ex: iPhone 15/14/13, Samsung Galaxy S24, MacBook Air, Universel..."
      }
    ]
  },

  // 5. WATCHES (Smartwatches & Classic)
  watch: {
    label: "⌚ Montres & Smartwatches",
    keywords: ["montre", "watch", "smartwatch", "horloge"],
    fields: [
      { 
        name: "Type de Montre", 
        key: "watchType",
        type: "select",
        options: ["Smartwatch (Connectée)", "Classique (Analogique)", "Digitale (Casio style)", "Hybride", "Sport / Fitness Tracker", "Luxe"]
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "select",
        options: ["Apple", "Samsung", "Garmin", "Casio", "Rolex", "Fossil", "Huawei", "Xiaomi / Amazfit", "Seiko", "Tissot", "Autre"]
      },
      { 
        name: "Taille Boîtier", 
        key: "caseSize",
        type: "select",
        options: ["38mm", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "49mm Ultra"]
      },
      { 
        name: "Matériau Boîtier", 
        key: "caseMaterial",
        type: "select",
        options: ["Aluminium", "Acier Inoxydable", "Titane", "Céramique", "Plastique / Résine"]
      },
      { 
        name: "Matériau Bracelet", 
        key: "strapMaterial",
        type: "select",
        options: ["Silicone Sport", "Cuir Véritable", "Acier Inoxydable (Maillons)", "Nylon / Boucle Boucle", "Caoutchouc"]
      },
      { 
        name: "Résistance Eau", 
        key: "waterResistance",
        type: "select",
        options: ["Non étanche", "3ATM (30m)", "5ATM (50m)", "10ATM (100m)", "IP67", "IP68"]
      },
      { 
        name: "Autonomie Batterie", 
        key: "batteryLife",
        type: "text",
        placeholder: "Ex: 18h (Apple Watch), 2 jours, 7 jours, 14 jours..."
      },
      { 
        name: "Connectivité & Capteurs", 
        key: "connectivitySensors",
        type: "text",
        placeholder: "Ex: Bluetooth, WiFi, GPS intégré, 4G LTE, ECG, Capteur Cardiaque"
      },
      { 
        name: "Mouvement", 
        key: "movement",
        type: "select",
        options: ["N/A (Smartwatch)", "Quartz (Pile)", "Mécanique Automatique", "Mécanique Manuel", "Solaire (Tough Solar)"]
      }
    ]
  },

  // 6. AUDIO (Headphones & Earbuds)
  audio: {
    label: "🎧 Audio (Casques & Écouteurs)",
    keywords: ["audio", "casque", "écouteur", "ecouteur", "headphone", "airpods", "earbuds", "enceinte", "haut-parleur", "micro"],
    fields: [
      { 
        name: "Type d'Audio", 
        key: "audioType",
        type: "select",
        options: ["Casque Over-Ear (Circum-aural)", "Casque On-Ear (Supra-aural)", "Écouteurs Intra-auriculaires", "Earbuds True Wireless (TWS)", "Enceinte Portable Bluetooth", "Microphone Studio"]
      },
      { 
        name: "Connectivité", 
        key: "connection",
        type: "select",
        options: ["Bluetooth 5.3 / 5.2", "Filaire (Jack 3.5mm)", "USB-C Filaire", "Lightning Filaire", "Sans fil (Dongle 2.4GHz)"]
      },
      { 
        name: "Réduction de Bruit (ANC)", 
        key: "anc",
        type: "select",
        options: ["Oui - Active Noise Cancellation (ANC)", "Isolation Passive uniquement", "Non"]
      },
      { 
        name: "Autonomie", 
        key: "batteryLife",
        type: "text",
        placeholder: "Ex: 6h + 24h avec boîtier, 30 heures d'écoute..."
      },
      { 
        name: "Résistance Eau", 
        key: "waterproof",
        type: "select",
        options: ["Aucune", "IPX4 (Resistant aux éclaboussures / sueur)", "IPX5", "IPX7 (Étanche immersible)", "IP68"]
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "text",
        placeholder: "Sony, Bose, JBL, Apple, Samsung, Sennheiser, Anker Soundcore..."
      }
    ]
  },

  // 7. SMARTPHONES
  smartphone: {
    label: "📱 Smartphones & Téléphones",
    keywords: ["smartphone", "téléphone", "telephone", "iphone", "galaxy", "pixel", "xiaomi", "mobile", "phone"],
    fields: [
      { 
        name: "Marque", 
        key: "brand",
        type: "select",
        options: ["Apple (iPhone)", "Samsung", "Xiaomi / Redmi / Poco", "Huawei", "Oppo", "Tecno", "Infinix", "Itel", "Realme", "Google Pixel", "OnePlus", "Autre"]
      },
      { 
        name: "Modèle", 
        key: "model",
        type: "text",
        placeholder: "Ex: Galaxy S23 Ultra, iPhone 14 Pro, Redmi Note 13..."
      },
      { 
        name: "Stockage Interne", 
        key: "storage",
        type: "select",
        options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"]
      },
      { 
        name: "RAM", 
        key: "ram",
        type: "select",
        options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"]
      },
      { 
        name: "État Batterie", 
        key: "batteryHealth",
        type: "text",
        placeholder: "Ex: 100% Neuf, 85%, 92%..."
      },
      { 
        name: "Double SIM", 
        key: "dualSim",
        type: "select",
        options: ["Oui (2x Nano-SIM)", "Oui (eSIM + Nano-SIM)", "Non (Mono-SIM)"]
      },
      { 
        name: "5G Compatible", 
        key: "is5G",
        type: "select",
        options: ["Oui (5G Ready)", "Non (4G / LTE)"]
      }
    ]
  },

  // 8. MONITORS / SCREENS
  monitor: {
    label: "🖥️ Écrans & Moniteurs",
    keywords: ["écran", "ecran", "moniteur", "monitor", "display"],
    fields: [
      { 
        name: "Taille Écran", 
        key: "screenSize",
        type: "select",
        options: ["19\"", "21.5\"", "24\"", "27\"", "32\"", "34\" Ultrawide", "40\"+ Super Ultrawide"]
      },
      { 
        name: "Résolution", 
        key: "resolution",
        type: "select",
        options: ["HD (1366x768)", "Full HD (1080p)", "2K / QHD (1440p)", "4K UHD (2160p)", "5K Retina", "8K UHD"]
      },
      { 
        name: "Type de Dalle", 
        key: "panelType",
        type: "select",
        options: ["IPS (Couleurs & Angles de vision)", "TN (Temps de réponse rapide)", "VA (Haut contraste)", "OLED (Noirs absolus)", "Mini-LED"]
      },
      { 
        name: "Taux de Rafraîchissement", 
        key: "refreshRate",
        type: "select",
        options: ["60Hz", "75Hz", "120Hz", "144Hz", "165Hz", "240Hz+"]
      },
      { 
        name: "Connectique", 
        key: "connectivity",
        type: "text",
        placeholder: "Ex: 2x HDMI 2.0, 1x DisplayPort 1.4, USB-C (Power Delivery 65W), VGA"
      },
      { 
        name: "Courbé", 
        key: "isCurved",
        type: "select",
        options: ["Non (Écran Plat)", "Oui (Écran Courbé Curved)"]
      }
    ]
  },

  // 9. GAMING ACCESSORIES
  gaming: {
    label: "🎮 Gaming & Accessoires",
    keywords: ["gaming", "manette", "joystick", "volant", "jeu", "console", "gamepad", "siège gamer"],
    fields: [
      { 
        name: "Type d'Accessoire", 
        key: "accessoryType",
        type: "select",
        options: [
          "Manette / Gamepad", 
          "Volant de Course + Pédalier", 
          "Joystick / Flightstick", 
          "Clavier Mécanique Gaming", 
          "Souris Gaming", 
          "Tapis de souris XXL", 
          "Siège / Fauteuil Gamer",
          "Casque Gaming VR / AR"
        ]
      },
      { 
        name: "Plateforme", 
        key: "platform",
        type: "select",
        options: ["Multi-Plateforme (PC/PS5/Xbox/Switch)", "PC (Windows)", "PS5 / PS4", "Xbox Series X/S / Xbox One", "Nintendo Switch", "Mobile (Android/iOS)"]
      },
      { 
        name: "Connectivité", 
        key: "connection",
        type: "select",
        options: ["Filaire (USB)", "Sans fil (Bluetooth)", "Sans fil (Dongle 2.4GHz Ultra-fast)"]
      },
      { 
        name: "Éclairage RGB", 
        key: "rgbLighting",
        type: "select",
        options: ["Oui (RGB Personnalisable)", "Oui (Rétroéclairage simple)", "Non"]
      },
      { 
        name: "Switches (Claviers)", 
        key: "switches",
        type: "select",
        options: ["N/A", "Switch Red (Linéaire)", "Switch Blue (Clicky)", "Switch Brown (Tactile)", "Switch Silent (Silencieux)", "Switch Optical"]
      },
      { 
        name: "DPI Max (Souris)", 
        key: "maxDpi",
        type: "text",
        placeholder: "Ex: 16000 DPI, 25600 DPI Capteur Hero..."
      }
    ]
  },

  // 11. TABLETS
  tablet: {
    label: "📱 Tablettes (iPad, Galaxy Tab, etc.)",
    keywords: ["tablette", "tablet", "ipad", "galaxy tab", "matepad"],
    fields: [
      { name: "Marque", key: "brand", type: "select", options: ["Apple (iPad)", "Samsung", "Lenovo", "Huawei", "Xiaomi", "Autre"] },
      { name: "Modèle", key: "model", type: "text", placeholder: "Ex: iPad Air 5, Galaxy Tab S9..." },
      { name: "Stockage", key: "storage", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] },
      { name: "Taille Écran", key: "screenSize", type: "select", options: ["8\"", "9.7\"", "10.2\"", "10.9\"", "11\"", "12.9\"", "14.6\""] },
      { name: "Connectivité", key: "connectivity", type: "select", options: ["WiFi Uniquement", "WiFi + 4G/5G"] },
      { name: "Accessoires Inclus", key: "accessories", type: "text", placeholder: "Ex: Chargeur, Clavier détachable, Apple Pencil..." }
    ]
  },

  // 12. NETWORKING
  networking: {
    label: "🌐 Réseaux & Connectivité",
    keywords: ["routeur", "switch", "wifi", "réseau", "carte réseau", "modem", "point d'accès"],
    fields: [
      { name: "Type", key: "deviceType", type: "select", options: ["Routeur WiFi", "Switch Ethernet", "Carte Réseau USB", "Modem", "Point d'accès (AP)", "Antenne / Adaptateur"] },
      { name: "Marque", key: "brand", type: "select", options: ["TP-Link", "D-Link", "Netgear", "Asus", "Ubiquiti", "MikroTik", "Linksys", "Autre"] },
      { name: "Vitesse Max", key: "maxSpeed", type: "select", options: ["100 Mbps", "1 Gbps", "2.5 Gbps", "10 Gbps"] },
      { name: "WiFi Standard", key: "wifiStandard", type: "select", options: ["WiFi 5 (802.11ac)", "WiFi 6 (802.11ax)", "WiFi 6E", "WiFi 7"] },
      { name: "Ports / Connectique", key: "ports", type: "text", placeholder: "Ex: 4x Gigabit LAN, 1x WAN, 1x USB 3.0" }
    ]
  },

  // 10. GENERIC / OTHER PRODUCTS
  generic: {
    label: "📦 Produit Général / Autre",
    keywords: ["general", "autres", "other"],
    fields: [
      { name: "Type de Produit", key: "productType", type: "text", placeholder: "Ex: Support écran, Sacoche ordinateur, Nettoyant..." },
      { name: "Caractéristiques Principales", key: "keyFeatures", type: "text", placeholder: "Ex: Ultra-résistant, Ergonomique, Garantie 2 ans..." },
      { name: "Marque", key: "brand", type: "text", placeholder: "Marque ou Fabricant" },
      { name: "Compatibilité", key: "compatibility", type: "text", placeholder: "Ex: Tous ordinateurs 13 à 16 pouces" }
    ]
  }
};

/**
 * Returns the matching category schema based on a category name or slug.
 * @param {string} categoryName - Category name selected in admin dropdown
 * @returns {object} Schema containing label, keywords, and fields array
 */
export function getCategorySchema(categoryName) {
  if (!categoryName || typeof categoryName !== 'string') {
    return productCategorySchemas.generic;
  }

  const catLower = categoryName.toLowerCase().trim();

  // Try exact key match first
  if (productCategorySchemas[catLower]) {
    return productCategorySchemas[catLower];
  }

  // Try matching against known category labels
  for (const key of Object.keys(productCategorySchemas)) {
    const schema = productCategorySchemas[key];
    if (schema.label && schema.label.toLowerCase().includes(catLower)) {
      return schema;
    }
  }

  // Search by keywords match
  for (const key of Object.keys(productCategorySchemas)) {
    const schema = productCategorySchemas[key];
    if (schema.keywords && schema.keywords.some(kw => catLower.includes(kw))) {
      return schema;
    }
  }

  return productCategorySchemas.generic;
}

/**
 * Get available series for a laptop brand
 * @param {string} brand - Laptop brand name
 * @returns {Array<string>} List of series for the brand
 */
export function getBrandSeries(brand) {
  if (!brand) return [];
  const normalizedBrand = Object.keys(laptopBrandSeriesMap).find(
    b => b.toLowerCase() === brand.toLowerCase()
  );
  return normalizedBrand ? laptopBrandSeriesMap[normalizedBrand] : [];
}

/**
 * Get all unique field types used across schemas
 * @returns {Array<string>} Array of field types
 */
export function getAllFieldTypes() {
  const types = new Set();
  for (const key of Object.keys(productCategorySchemas)) {
    const schema = productCategorySchemas[key];
    if (schema.fields) {
      schema.fields.forEach(field => {
        if (field.type) types.add(field.type);
      });
    }
  }
  return Array.from(types);
}

/**
 * Get all brand options across all schemas
 * @returns {Array<string>} Array of brand names
 */
export function getAllBrands() {
  const brands = new Set();
  for (const key of Object.keys(productCategorySchemas)) {
    const schema = productCategorySchemas[key];
    if (schema.fields) {
      schema.fields.forEach(field => {
        if (field.key === 'brand' && Array.isArray(field.options)) {
          field.options.forEach(opt => brands.add(opt));
        }
      });
    }
  }
  return Array.from(brands);
}
