import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Gisyit Store",
  version: packageJson.version,
  copyright: `© ${currentYear}, Gisyit Store.`,
  meta: {
    title: "Gisyit Store - 商店管理后台",
    description:
      "Gisyit Store 管理后台，用于管理商品、订单和用户。",
  },
};
