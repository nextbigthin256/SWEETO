/**
 * Dynamic Product Specification Schemas per Category
 * Allows admin product creation/edit form to show unique, targeted fields based on product category.
 */

export const productCategorySchemas = {
  // 1. RAM MODULES
  ram: {
    label: "💾 Mémoire RAM",
    keywords: ["ram", "mémoire", "memoire"],
    fields: [
      { 
        name: "Type de RAM", 
        key: "ramType",
        type: "select",
        options: ["DDR5", "DDR4", "DDR3", "DDR3L", "DDR2", "LPDDR4", "LPDDR5"]
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
        options: ["2133 MHz", "2400 MHz", "2666 MHz", "3000 MHz", "3200 MHz", "3600 MHz", "4800 MHz", "5600 MHz", "6000+ MHz"]
      },
      { 
        name: "Format", 
        key: "formFactor",
        type: "select",
        options: ["DIMM (PC Bureau)", "SO-DIMM (PC Portable)"]
      },
      { 
        name: "Latence CAS", 
        key: "casLatency",
        type: "text",
        placeholder: "Ex: CL16, CL18, CL30, CL36..." 
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "text", 
        placeholder: "Corsair, Kingston, Crucial, G.Skill..." 
      },
      { 
        name: "État", 
        key: "condition",
        type: "select",
        options: ["Neuf", "Occasion", "Reconditionné"]
      }
    ]
  },

  // 2. CABLES & ADAPTERS
  cable: {
    label: "🔌 Câbles & Adaptateurs",
    keywords: ["câble", "cable", "cordon", "adaptateur cable"],
    fields: [
      { 
        name: "Type de câble", 
        key: "cableType",
        type: "select",
        options: [
          "USB-C vers USB-C", 
          "USB-C vers USB-A", 
          "USB-C vers Lightning",
          "Micro-USB", 
          "Lightning (iPhone)", 
          "HDMI 2.1", 
          "DisplayPort 1.4",
          "Ethernet RJ45 (Cat 6/7/8)",
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
        name: "Puissance de charge", 
        key: "chargingPower",
        type: "select",
        options: ["15W", "18W", "20W", "25W", "30W", "45W", "60W", "65W", "100W", "240W"]
      },
      { 
        name: "Vitesse de transfert", 
        key: "dataTransfer",
        type: "select",
        options: [
          "USB 2.0 (480 Mbps)", 
          "USB 3.0/3.1 (5 Gbps)", 
          "USB 3.2 Gen2 (10 Gbps)",
          "Thunderbolt 3 (40 Gbps)", 
          "Thunderbolt 4 (40 Gbps)",
          "Charge uniquement (pas de données)"
        ]
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "text",
        placeholder: "Anker, Ugreen, Baseus, Apple..."
      },
      { 
        name: "État", 
        key: "condition",
        type: "select",
        options: ["Neuf", "Occasion"] 
      }
    ]
  },

  // 3. CHARGERS & POWER BANKS
  charger: {
    label: "⚡ Chargeurs & Adaptateurs Secteur",
    keywords: ["chargeur", "charger", "powerbank", "secteur", "bloc de charge"],
    fields: [
      { 
        name: "Type de chargeur", 
        key: "chargerType",
        type: "select",
        options: [
          "Chargeur mural (Prise)", 
          "Chargeur voiture (Allume-cigare)", 
          "Chargeur sans fil (MagSafe/Qi)",
          "Batterie externe (Powerbank)", 
          "Chargeur USB multiple ports",
          "Station de charge / Dock"
        ]
      },
      { 
        name: "Puissance (Watt)", 
        key: "wattage",
        type: "select",
        options: ["5W", "10W", "12W", "15W", "18W", "20W", "25W", "30W", "45W", "65W", "87W", "96W", "100W", "120W+"]
      },
      { 
        name: "Nombre de ports", 
        key: "ports",
        type: "select",
        options: ["1 port", "2 ports", "3 ports", "4+ ports"]
      },
      { 
        name: "Charge rapide", 
        key: "fastCharging",
        type: "select",
        options: [
          "Non", 
          "Power Delivery (PD 3.0)",
          "Quick Charge (QC 4.0/3.0)", 
          "SuperVOOC / Warp Charge", 
          "SuperCharge (Huawei)", 
          "Adaptive Fast Charging (Samsung)"
        ]
      },
      { 
        name: "Compatibilité", 
        key: "compatibility",
        type: "text",
        placeholder: "iPhone 15/14, Samsung Galaxy S24, MacBook, Universel..."
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "text",
        placeholder: "Samsung, Apple, Anker, Baseus..."
      },
      { 
        name: "État", 
        key: "condition",
        type: "select",
        options: ["Neuf", "Occasion"] 
      }
    ]
  },

  // 4. STORAGE (SSD, HDD, USB)
  storage: {
    label: "💽 Disques & Stockage",
    keywords: ["stockage", "disque", "ssd", "hdd", "nvme", "clé usb", "cle usb", "carte sd"],
    fields: [
      { 
        name: "Type de stockage", 
        key: "storageType",
        type: "select",
        options: [
          "SSD NVMe M.2", 
          "SSD Interne (SATA 2.5\")", 
          "HDD Interne (2.5\" Laptop)",
          "HDD Interne (3.5\" PC Bureau)", 
          "SSD Externe Portable",
          "HDD Externe", 
          "Clé USB",
          "Carte MicroSD / SDXC"
        ]
      },
      { 
        name: "Capacité", 
        key: "capacity",
        type: "select",
        options: ["64GB", "120GB", "128GB", "240GB", "256GB", "480GB", "500GB", "512GB", "1TB", "2TB", "4TB", "8TB+"]
      },
      { 
        name: "Interface", 
        key: "interface",
        type: "select",
        options: ["NVMe PCIe 4.0", "NVMe PCIe 3.0", "NVMe PCIe 5.0", "SATA III (6 Gb/s)", "USB 3.2 Gen2", "USB 3.0", "Type-C", "Thunderbolt 4"]
      },
      { 
        name: "Vitesse de lecture", 
        key: "readSpeed",
        type: "text",
        placeholder: "Ex: 550 MB/s, 3500 MB/s, 7300 MB/s..."
      },
      { 
        name: "Marque", 
        key: "brand",
        type: "text",
        placeholder: "Samsung, Crucial, SanDisk, Western Digital, Kingston..."
      },
      { 
        name: "État", 
        key: "condition",
        type: "select",
        options: ["Neuf", "Occasion", "Reconditionné"] 
      }
    ]
  },

  // 5. LAPTOPS
  laptop: {
    label: "💻 Ordinateurs Portables",
    keywords: ["laptop", "ordinateur portable", "macbook", "pc portable", "notebook"],
    fields: [
      { 
        name: "Processeur (CPU)", 
        key: "cpu",
        type: "text",
        placeholder: "Ex: Intel Core i7-13700H, Apple M2 Pro, AMD Ryzen 7 7840U..."
      },
      { 
        name: "Mémoire RAM", 
        key: "ram",
        type: "select",
        options: ["8GB", "16GB", "24GB", "32GB", "64GB"]
      },
      { 
        name: "Stockage", 
        key: "storage",
        type: "select",
        options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"]
      },
      { 
        name: "Taille d'écran", 
        key: "screenSize",
        type: "select",
        options: ["13.3\"", "14.0\"", "15.6\"", "16.0\"", "17.3\""]
      },
      { 
        name: "Carte Graphique (GPU)", 
        key: "gpu",
        type: "text",
        placeholder: "Ex: NVIDIA RTX 4060 8GB, Intel Iris Xe, Apple GPU 10-core..."
      },
      { 
        name: "Système d'exploitation", 
        key: "os",
        type: "select",
        options: ["Windows 11 Pro", "Windows 11 Home", "macOS", "Linux Ubuntu", "Sans OS (FreeDOS)"]
      },
      { 
        name: "État", 
        key: "condition",
        type: "select",
        options: ["Neuf", "Reconditionné Grade A+", "Occasion"] 
      }
    ]
  },

  // 6. DESKTOPS
  desktop: {
    label: "🖥️ Ordinateurs de Bureau",
    keywords: ["desktop", "ordinateur de bureau", "pc fixe", "tour pc", "station de travail"],
    fields: [
      { 
        name: "Processeur (CPU)", 
        key: "cpu",
        type: "text",
        placeholder: "Ex: Intel Core i9-14900K, AMD Ryzen 9 7900X..."
      },
      { 
        name: "Mémoire RAM", 
        key: "ram",
        type: "select",
        options: ["8GB", "16GB", "32GB", "64GB", "128GB"]
      },
      { 
        name: "Stockage Principal", 
        key: "storage",
        type: "select",
        options: ["256GB SSD", "512GB SSD", "1TB NVMe SSD", "2TB NVMe SSD", "512GB SSD + 2TB HDD"]
      },
      { 
        name: "Carte Graphique (GPU)", 
        key: "gpu",
        type: "text",
        placeholder: "Ex: NVIDIA RTX 4070 Ti 12GB, AMD RX 7800 XT..."
      },
      { 
        name: "Alimentation (PSU)", 
        key: "psu",
        type: "text",
        placeholder: "Ex: Corsair 750W 80+ Gold"
      },
      { 
        name: "Format Boîtier", 
        key: "caseType",
        type: "select",
        options: ["Moyen Tour (ATX)", "Grande Tour (E-ATX)", "Mini PC / SFF (Micro-ATX)", "All-in-One (Tout-en-un)"]
      },
      { 
        name: "État", 
        key: "condition",
        type: "select",
        options: ["Neuf", "Occasion", "Reconditionné"] 
      }
    ]
  },

  // 7. PROCESSORS (CPU)
  processor: {
    label: "⚙️ Processeurs (CPU)",
    keywords: ["processeur", "processor", "cpu", "intel core", "ryzen"],
    fields: [
      { 
        name: "Socket", 
        key: "socket",
        type: "select",
        options: ["LGA 1700 (Intel 12/13/14th)", "AM5 (AMD Ryzen 7000/8000/9000)", "AM4 (AMD Ryzen 3000/5000)", "LGA 1200", "Autre"]
      },
      { 
        name: "Nombre de cœurs", 
        key: "cores",
        type: "select",
        options: ["4 Cœurs / 8 Threads", "6 Cœurs / 12 Threads", "8 Cœurs / 16 Threads", "12 Cœurs / 24 Threads", "16 Cœurs / 32 Threads", "24 Cœurs"]
      },
      { 
        name: "Fréquence Boost", 
        key: "boostClock",
        type: "text",
        placeholder: "Ex: 4.9 GHz, 5.4 GHz, 5.8 GHz..."
      },
      { 
        name: "TDP (Consommation)", 
        key: "tdp",
        type: "text",
        placeholder: "Ex: 65W, 105W, 125W..."
      },
      { 
        name: "Graphiques intégrés", 
        key: "gpuIntegrated",
        type: "select",
        options: ["Oui (iGPU inclus)", "Non (Nécessite carte graphique dédiée)"]
      }
    ]
  },

  // 8. GRAPHICS CARDS (GPU)
  graphics_card: {
    label: "🎮 Cartes Graphiques (GPU)",
    keywords: ["carte graphique", "graphics_card", "gpu", "rtx", "radeon", "nvidia"],
    fields: [
      { 
        name: "VRAM Capacité", 
        key: "vram",
        type: "select",
        options: ["4GB", "6GB", "8GB", "12GB", "16GB", "20GB", "24GB"]
      },
      { 
        name: "Type de VRAM", 
        key: "vramType",
        type: "select",
        options: ["GDDR6X", "GDDR6", "GDDR5"]
      },
      { 
        name: "Connecteurs Alimentation", 
        key: "powerConnectors",
        type: "select",
        options: ["1x 8-pin PCIe", "2x 8-pin PCIe", "1x 16-pin 12VHPWR (PCIe 5.0)", "Aucun (75W PCIe Slot)"]
      },
      { 
        name: "Ports de sortie", 
        key: "displayOutputs",
        type: "text",
        placeholder: "Ex: 3x DisplayPort 1.4, 1x HDMI 2.1"
      }
    ]
  },

  // 9. KEYBOARDS
  keyboard: {
    label: "⌨️ Claviers & Keyboards",
    keywords: ["clavier", "keyboard", "keycap"],
    fields: [
      { 
        name: "Type de clavier", 
        key: "keyboardType",
        type: "select",
        options: ["Mécanique Custom", "Mécanique Standard", "Membrane Silencieuse", "Optique-Mécanique"]
      },
      { 
        name: "Format / Layout", 
        key: "layout",
        type: "select",
        options: ["100% Full-Size (avec pavé numérique)", "80% TKL (Tenkeyless)", "75% Compact", "65% Ultra-Compact", "60% Minimalist"]
      },
      { 
        name: "Type de Switchs", 
        key: "switches",
        type: "select",
        options: ["Switch Red (Lineaire / Silencieux)", "Switch Blue (Clicky / Tactile)", "Switch Brown (Tactile)", "Hot-Swappable (Interchangeables)"]
      },
      { 
        name: "Connectivité", 
        key: "connection",
        type: "select",
        options: ["Tri-mode (Bluetooth + 2.4GHz + Type-C)", "Filaire USB-C détachable", "Bluetooth & Filaire", "Sans fil 2.4GHz Dongle"]
      },
      { 
        name: "Rétroéclairage", 
        key: "rgb",
        type: "select",
        options: ["RGB 16.8M Couleurs", "Blanc LED", "Non rétroéclairé"]
      }
    ]
  },

  // 10. MICE & PADS
  mouse: {
    label: "🖱️ Souris & Tapis de Bureau",
    keywords: ["souris", "mouse", "tapis", "deskpad"],
    fields: [
      { 
        name: "Sensibilité Capteur (DPI)", 
        key: "dpi",
        type: "select",
        options: ["3200 DPI", "6400 DPI", "12000 DPI", "16000 DPI", "26000+ DPI Custom"]
      },
      { 
        name: "Connectivité", 
        key: "connection",
        type: "select",
        options: ["Sans fil 2.4GHz + Bluetooth", "Filaire USB Tressé", "Rechargeable Type-C USB"]
      },
      { 
        name: "Poids", 
        key: "weight",
        type: "text",
        placeholder: "Ex: 60g Ultra-léger, 85g, 120g..."
      },
      { 
        name: "Boutons programmables", 
        key: "buttonsCount",
        type: "select",
        options: ["2 à 4 boutons", "6 boutons (Standard Gaming)", "8+ boutons (MMO/Productivité)"]
      }
    ]
  },

  // 11. HEADPHONES & AUDIO
  headphone: {
    label: "🎧 Casques Audio & Écouteurs",
    keywords: ["casque", "écouteur", "ecouteur", "headphone", "audio", "airpods", "enceinte", "haut-parleur", "micro"],
    fields: [
      { 
        name: "Type d'appareil", 
        key: "audioType",
        type: "select",
        options: [
          "Casque Circum-aural (Over-Ear)", 
          "Écouteurs True Wireless (TWS)", 
          "Casque Gamer avec Microphone", 
          "Enceinte Portable Bluetooth",
          "Microphone Studio USB/XLR"
        ]
      },
      { 
        name: "Réduction de Bruit (ANC)", 
        key: "anc",
        type: "select",
        options: ["Oui - ANC Active Hybride", "Réduction Passive Isolation", "Non"]
      },
      { 
        name: "Autonomie Batterie", 
        key: "batteryLife",
        type: "text",
        placeholder: "Ex: 30 Heures (Casque), 6h + 24h avec Boîtier (TWS)"
      },
      { 
        name: "Connexion", 
        key: "connection",
        type: "select",
        options: ["Bluetooth 5.3 / 5.2", "Jack 3.5mm + Bluetooth", "Dongle 2.4GHz (Gaming ultra-low latency)", "Filaire USB-C / USB-A"]
      }
    ]
  },

  // 12. SMARTPHONES
  smartphone: {
    label: "📱 Smartphones & Téléphones",
    keywords: ["smartphone", "téléphone", "telephone", "iphone", "galaxy", "pixel", "xiaomi"],
    fields: [
      { 
        name: "Taille d'Écran", 
        key: "screenSize",
        type: "select",
        options: ["6.1\" OLED/AMOLED", "6.5\" 120Hz", "6.7\" Super Retina", "6.8\" Dynamic AMOLED 2X"]
      },
      { 
        name: "Stockage Interne", 
        key: "storage",
        type: "select",
        options: ["64GB", "128GB", "256GB", "512GB", "1TB"]
      },
      { 
        name: "Mémoire RAM", 
        key: "ram",
        type: "select",
        options: ["4GB", "6GB", "8GB", "12GB", "16GB"]
      },
      { 
        name: "Appareil Photo Principal", 
        key: "camera",
        type: "text",
        placeholder: "Ex: Triple capteur 50MP + 12MP + 10MP (8K Video)"
      },
      { 
        name: "Batterie & Charge", 
        key: "battery",
        type: "text",
        placeholder: "Ex: 5000 mAh (Charge rapide 45W)"
      },
      { 
        name: "Système d'exploitation", 
        key: "os",
        type: "select",
        options: ["Android 14", "iOS 17", "Android 13"]
      }
    ]
  },

  // 13. MONITORS & SCREENS
  monitor: {
    label: "🖥️ Écrans & Moniteurs",
    keywords: ["écran", "ecran", "moniteur", "monitor", "display"],
    fields: [
      { 
        name: "Taille d'Écran", 
        key: "screenSize",
        type: "select",
        options: ["24\"", "27\"", "32\"", "34\" Ultrawide (21:9)", "49\" Super Ultrawide (32:9)"]
      },
      { 
        name: "Résolution", 
        key: "resolution",
        type: "select",
        options: ["1080p Full HD (1920x1080)", "1440p Quad HD / 2K (2560x1440)", "4K Ultra HD (3840x2160)", "5K Retina"]
      },
      { 
        name: "Taux de rafraîchissement", 
        key: "refreshRate",
        type: "select",
        options: ["60 Hz (Bureautique)", "75 Hz", "144 Hz (Gaming)", "165 Hz", "240 Hz", "360 Hz"]
      },
      { 
        name: "Type de Dalle", 
        key: "panelType",
        type: "select",
        options: ["IPS (Excellentes couleurs)", "OLED (Noirs parfaits & 0.03ms)", "VA (Haut contraste)", "TN (Compétitif)"]
      },
      { 
        name: "Temps de réponse", 
        key: "responseTime",
        type: "select",
        options: ["0.03 ms GTG", "1 ms GTG", "4 ms", "5 ms"]
      }
    ]
  },

  // GENERIC FALLBACK
  generic: {
    label: "⚙️ Spécifications Générales Tech",
    keywords: ["general", "autres", "other"],
    fields: [
      { name: "Modèle / Référence", key: "model", type: "text", placeholder: "Ex: PRO-2026-V2" },
      { name: "Matériaux de fabrication", key: "material", type: "text", placeholder: "Ex: Aluminium brossé, Plastique ABS..." },
      { name: "Couleur / Finition", key: "color", type: "text", placeholder: "Ex: Noir Mat, Gris Sidéral..." },
      { name: "Garantie Constructeur", key: "warranty", type: "select", options: ["1 An Garantie", "2 Ans Garantie", "6 Mois", "Sans Garantie"] },
      { name: "État du Produit", key: "condition", type: "select", options: ["Neuf", "Occasion", "Reconditionné"] }
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

  // Search by keywords match
  for (const key of Object.keys(productCategorySchemas)) {
    const schema = productCategorySchemas[key];
    if (schema.keywords && schema.keywords.some(kw => catLower.includes(kw))) {
      return schema;
    }
  }

  return productCategorySchemas.generic;
}
