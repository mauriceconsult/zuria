// lib/studio/types.ts
// Richer types that give the AI agent enough context to reason meaningfully.
// Fields are optional to handle partial API responses gracefully.

// ── Shared ────────────────────────────────────────────────────────────────────
export type Identity = { id?: string };

// ── InstaSkul ─────────────────────────────────────────────────────────────────
export type Admin = {
  id?: string;
  title?: string;
  userId?: string;
  imageUrl?: string;
  createdAt?: string;
};

export type Course = {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  isPublished?: boolean;
  adminId?: string;
  price?: number;
  createdAt?: string;
  // Populated from includes
  tutors?: Tutorial[];
  courseworks?: Coursework[];
};

export type Tutorial = {
  id?: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  isPublished?: boolean;
  isFree?: boolean;
  position?: number;
  courseId?: string;
};

export type Coursework = {
  id?: string;
  title?: string;
  description?: string;
  isPublished?: boolean;
  position?: number;
  courseId?: string;
};

export type Noticeboard = {
  id?: string;
  title?: string;
  description?: string;
  isPublished?: boolean;
  adminId?: string;
};

// ── Vendly / Zuria ────────────────────────────────────────────────────────────
export type Shop = {
  id?: string;
  name?: string;
  userId?: string;
  currency?: string;
  country?: string;
  address?: string;
  phone?: string;
  momoPhone?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
};

export type Product = {
  id?: string;
  name?: string;
  price?: number;
  isFeatured?: boolean;
  isArchived?: boolean;
  categoryId?: string;
  shopId?: string;
  createdAt?: string;
};

export type Order = {
  id?: string;
  isPaid?: boolean;
  paymentStatus?: string;
  paymentMethod?: string;
  phone?: string;
  address?: string;
  deliveryMethod?: string;
  deliveryStatus?: string;
  deliveryCost?: number;
  platformFee?: number;
  shopPayout?: number;
  shopId?: string;
  createdAt?: string;
  deliveredAt?: string;
};

export type Category = {
  id?: string;
  name?: string;
  shopId?: string;
};

export type Size = {
  id?: string;
  name?: string;
  value?: string;
};

export type Color = {
  id?: string;
  name?: string;
  value?: string;
};

export type Billboard = {
  id?: string;
  label?: string;
  imageUrl?: string;
  shopId?: string;
};

export type RefundRequest = {
  id?: string;
  status?: string;
  reason?: string;
  orderId?: string;
  shopId?: string;
  requestedAt?: string;
  resolvedAt?: string;
};

// ── Dukaboda ──────────────────────────────────────────────────────────────────
export type Delivery = {
  id?: string;
  orderId?: string;
  status?: string;
  deliveryCost?: number;
  riderId?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  createdAt?: string;
};

export type Rider = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  vehicleType?: string;
  isApproved?: boolean;
  isActive?: boolean;
  rating?: number;
  totalJobs?: number;
  approvedBy?: string;
  createdAt?: string;
};

// ── Blog (Maxnovate) ──────────────────────────────────────────────────────────
export type Writer = {
  id?: string;
  title?: string; // beat/topic title
  description?: string;
  userId?: string;
  isPublished?: boolean;
  createdAt?: string;
  // Populated from includes
  articles?: Article[];
};

export type Article = {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  isPublished?: boolean;
  writerId?: string;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Editor = {
  id?: string;
  userId?: string;
  role?: string;
};

export type BlogCategory = {
  id?: string;
  name?: string;
};

// ── Context shape ─────────────────────────────────────────────────────────────
export type PlatformContext = {
  instaskul: {
    admins: Admin[];
    courses: Course[];
    tutorials: Tutorial[];
    noticeboards: Noticeboard[];
  };
  vendly: {
    shops: Shop[];
    products: Product[];
    orders: Order[];
    categories: Category[];
    sizes: Size[];
    colors: Color[];
    billboards: Billboard[];
    refunds: RefundRequest[];
  };
  dukaboda: {
    deliveries: Delivery[];
    riders: Rider[];
  };
  blog: {
    writers: Writer[];
    articles: Article[];
    categories: BlogCategory[];
  };
  meta: {
    hasData: boolean;
    dataScore: number;
    connectedApps: string[];
  };
  insights?: string;
};
