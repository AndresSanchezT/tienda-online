// Datos iniciales: usuario admin, configuración y catálogo de ejemplo. Es idempotente (se puede correr varias veces).
//   npm run db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const img = (text: string, bg = "e4e4e7") => `https://placehold.co/800x800/${bg}/27272a/png?text=${encodeURIComponent(text)}`;

async function main() {
  // ─── Admin ───
  const email = (process.env.ADMIN_EMAIL ?? "admin@tienda.pe").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "cambia-esta-clave";
  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: process.env.ADMIN_NAME ?? "Administrador", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✓ Admin: ${email}`);

  // ─── Configuración ───
  await db.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "Mi Tienda",
      tagline: "Celulares, laptops y tecnología con envío a todo el Perú",
      whatsapp: "51999999999",
      contactEmail: "ventas@mitienda.pe",
      address: "Lima, Perú",
      pickupAddress: "Av. Ejemplo 123, Miraflores, Lima",
      shippingFlatRate: 1500,
      freeShippingFrom: 50000,
      yapePhone: "999999999",
      yapeHolder: "Mi Tienda SAC",
      bankAccounts: "BCP Soles: 191-0000000-0-00\nCCI: 002-191-000000000000-00\nTitular: Mi Tienda SAC",
    },
  });

  // ─── Categorías ───
  const cats = [
    { slug: "celulares", name: "Celulares", sortOrder: 1 },
    { slug: "laptops", name: "Laptops", sortOrder: 2 },
    { slug: "all-in-one", name: "PC All in One", sortOrder: 3 },
    { slug: "accesorios", name: "Accesorios", sortOrder: 4 },
    { slug: "autos", name: "Autos", sortOrder: 5 },
    { slug: "ropa", name: "Ropa", sortOrder: 6 },
    { slug: "juguetes", name: "Juguetes", sortOrder: 7 },
  ];
  const catId: Record<string, string> = {};
  for (const c of cats) {
    const row = await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    catId[c.slug] = row.id;
  }

  // ─── Marcas ───
  const brandNames = ["Apple", "Samsung", "Xiaomi", "Lenovo", "HP", "Toyota", "Lego"];
  const brandId: Record<string, string> = {};
  for (const name of brandNames) {
    const slug = name.toLowerCase();
    const row = await db.brand.upsert({ where: { slug }, update: {}, create: { name, slug } });
    brandId[name] = row.id;
  }

  // ─── Productos ───
  type Seed = {
    slug: string;
    name: string;
    category: string;
    brand?: string;
    price: number;
    compareAtPrice?: number;
    stock?: number;
    featured?: boolean;
    condition?: "NEW" | "USED" | "REFURBISHED";
    description: string;
    specs: Record<string, string>;
    images: string[];
    variants?: { options: Record<string, string>; price?: number; stock: number; sku?: string }[];
  };

  const products: Seed[] = [
    {
      slug: "iphone-16-pro",
      name: "iPhone 16 Pro",
      category: "celulares",
      brand: "Apple",
      price: 549900,
      compareAtPrice: 599900,
      featured: true,
      description: "Chip A18 Pro, cámara de 48 MP con zoom óptico 5x y marco de titanio.",
      specs: { Pantalla: '6.3" Super Retina XDR', Procesador: "A18 Pro", Cámara: "48 MP + 48 MP + 12 MP", Garantía: "1 año Apple" },
      images: [img("iPhone 16 Pro"), img("iPhone 16 Pro - posterior")],
      variants: [
        { options: { Color: "Titanio negro", Almacenamiento: "128 GB" }, stock: 5, sku: "IP16P-BLK-128" },
        { options: { Color: "Titanio negro", Almacenamiento: "256 GB" }, price: 609900, stock: 3, sku: "IP16P-BLK-256" },
        { options: { Color: "Titanio natural", Almacenamiento: "128 GB" }, stock: 4, sku: "IP16P-NAT-128" },
        { options: { Color: "Titanio natural", Almacenamiento: "256 GB" }, price: 609900, stock: 0, sku: "IP16P-NAT-256" },
      ],
    },
    {
      slug: "samsung-galaxy-s25",
      name: "Samsung Galaxy S25",
      category: "celulares",
      brand: "Samsung",
      price: 379900,
      featured: true,
      description: "Galaxy AI, Snapdragon 8 Elite y pantalla Dynamic AMOLED 2X de 120 Hz.",
      specs: { Pantalla: '6.2" AMOLED 120 Hz', Procesador: "Snapdragon 8 Elite", RAM: "12 GB", Batería: "4000 mAh" },
      images: [img("Galaxy S25", "dbeafe")],
      variants: [
        { options: { Color: "Azul", Almacenamiento: "256 GB" }, stock: 6, sku: "S25-BLU-256" },
        { options: { Color: "Negro", Almacenamiento: "256 GB" }, stock: 8, sku: "S25-BLK-256" },
        { options: { Color: "Negro", Almacenamiento: "512 GB" }, price: 429900, stock: 2, sku: "S25-BLK-512" },
      ],
    },
    {
      slug: "xiaomi-redmi-note-14",
      name: "Xiaomi Redmi Note 14",
      category: "celulares",
      brand: "Xiaomi",
      price: 89900,
      stock: 20,
      description: "Gran batería y cámara de 108 MP a un precio increíble.",
      specs: { Pantalla: '6.67" AMOLED', RAM: "8 GB", Almacenamiento: "256 GB", Batería: "5500 mAh" },
      images: [img("Redmi Note 14", "fef3c7")],
    },
    {
      slug: "iphone-13-seminuevo",
      name: "iPhone 13 128 GB (Seminuevo)",
      category: "celulares",
      brand: "Apple",
      price: 189900,
      stock: 2,
      condition: "USED",
      description: "Equipo seminuevo en excelente estado, batería al 88 %. Incluye cargador.",
      specs: { "Salud de batería": "88 %", Estado: "9/10", Garantía: "3 meses tienda" },
      images: [img("iPhone 13")],
    },
    {
      slug: "lenovo-ideapad-slim-5",
      name: 'Laptop Lenovo IdeaPad Slim 5 14"',
      category: "laptops",
      brand: "Lenovo",
      price: 329900,
      featured: true,
      description: "Ultradelgada, ideal para trabajo y estudio.",
      specs: { Procesador: "AMD Ryzen 7 8845HS", Pantalla: '14" OLED 2.8K', "Sistema operativo": "Windows 11 Home" },
      images: [img("IdeaPad Slim 5", "e0e7ff")],
      variants: [
        { options: { RAM: "16 GB", Almacenamiento: "512 GB SSD" }, stock: 4 },
        { options: { RAM: "32 GB", Almacenamiento: "1 TB SSD" }, price: 399900, stock: 2 },
      ],
    },
    {
      slug: "hp-all-in-one-24",
      name: 'HP All in One 24" Core i5',
      category: "all-in-one",
      brand: "HP",
      price: 289900,
      stock: 5,
      description: "Todo en uno con pantalla Full HD, teclado y mouse inalámbricos incluidos.",
      specs: { Procesador: "Intel Core i5-1335U", RAM: "16 GB", Almacenamiento: "512 GB SSD", Pantalla: '23.8" FHD' },
      images: [img("HP AiO 24", "dcfce7")],
    },
    {
      slug: "cargador-usb-c-20w",
      name: "Cargador USB-C 20 W",
      category: "accesorios",
      brand: "Apple",
      price: 9900,
      stock: 50,
      description: "Carga rápida para iPhone y dispositivos USB-C.",
      specs: { Potencia: "20 W", Conector: "USB-C" },
      images: [img("Cargador 20W")],
    },
    {
      slug: "toyota-yaris-2020",
      name: "Toyota Yaris 2020 Sedán",
      category: "autos",
      brand: "Toyota",
      price: 5490000,
      stock: 1,
      condition: "USED",
      description: "Único dueño, mantenimientos en concesionario. Ejemplo de cómo vender autos con la misma tienda.",
      specs: { Año: "2020", Kilometraje: "45 000 km", Motor: "1.5 L", Transmisión: "Automática", Combustible: "Gasolina" },
      images: [img("Toyota Yaris 2020", "fee2e2")],
    },
    {
      slug: "polo-algodon-basico",
      name: "Polo de algodón pima básico",
      category: "ropa",
      price: 4990,
      description: "100 % algodón pima peruano.",
      specs: { Material: "Algodón pima", Cuidado: "Lavar en frío" },
      images: [img("Polo Pima", "f5f5f4")],
      variants: [
        { options: { Talla: "S", Color: "Blanco" }, stock: 10 },
        { options: { Talla: "M", Color: "Blanco" }, stock: 12 },
        { options: { Talla: "L", Color: "Blanco" }, stock: 8 },
        { options: { Talla: "M", Color: "Negro" }, stock: 9 },
      ],
    },
    {
      slug: "lego-classic-caja-creativa",
      name: "LEGO Classic Caja Creativa",
      category: "juguetes",
      brand: "Lego",
      price: 15990,
      stock: 7,
      description: "Más de 400 piezas para construir sin límites.",
      specs: { "Edad recomendada": "4+", Piezas: "484" },
      images: [img("LEGO Classic", "fef9c3")],
    },
  ];

  for (const p of products) {
    const exists = await db.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        categoryId: catId[p.category],
        brandId: p.brand ? brandId[p.brand] : null,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock ?? 0,
        featured: p.featured ?? false,
        condition: p.condition ?? "NEW",
        specs: p.specs,
        images: p.images,
        variants: p.variants && {
          create: p.variants.map((v, i) => ({
            name: Object.values(v.options).join(" / "),
            options: v.options,
            price: v.price,
            stock: v.stock,
            sku: v.sku,
            sortOrder: i,
          })),
        },
      },
    });
  }
  console.log(`✓ ${products.length} productos de ejemplo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
