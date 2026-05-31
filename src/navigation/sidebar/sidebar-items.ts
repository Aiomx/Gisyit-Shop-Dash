import {
  Banknote,
  ChartBar,
  Crown,
  Fingerprint,
  FolderTree,
  Key,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Package,
  ShoppingCart,
  Sparkles,
  Tag,
  Users,
  Globe,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "概览",
    items: [
      {
        title: "数据看板",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "销售统计",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        title: "运营分析",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
    ],
  },
  {
    id: 2,
    label: "商品管理",
    items: [
      {
        title: "商品列表",
        url: "/dashboard/products",
        icon: Package,
      },
      {
        title: "板块管理",
        url: "/dashboard/sections",
        icon: LayoutGrid,
        isNew: true,
      },
      {
        title: "分类管理",
        url: "/dashboard/categories",
        icon: FolderTree,
      },
      {
        title: "品牌管理",
        url: "/dashboard/brands",
        icon: Tag,
        isNew: true,
      },
      {
        title: "CDK库存",
        url: "/dashboard/cdk",
        icon: Key,
      },
      {
        title: "Suite Code",
        url: "/dashboard/suite-code",
        icon: Sparkles,
        isNew: true,
      },
    ],
  },
  {
    id: 3,
    label: "订单管理",
    items: [
      {
        title: "订单列表",
        url: "/dashboard/orders",
        icon: ShoppingCart,
      },
    ],
  },
  {
    id: 4,
    label: "用户管理",
    items: [
      {
        title: "用户列表",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        title: "登录认证",
        url: "/auth",
        icon: Fingerprint,
        subItems: [
          { title: "登录 v1", url: "/auth/v1/login", newTab: true },
          { title: "登录 v2", url: "/auth/v2/login", newTab: true },
        ],
      },
    ],
  },
];
