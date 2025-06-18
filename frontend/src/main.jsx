import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./components/theme-provider";
import { UserProvider } from "./context/UserContext";
import { ProductProvider } from "./context/ProductContext";
import { CartProvider } from "./context/CartContext";

export const server = "https://e-commerce-5mjq.onrender.com";

export const categories = [
  "smartphone",
  "laptop",
  "tshirt",
  "refrigerator",
  "headphones",
  "watch",
  "shoes",
  "camera",
  "tablet",
  "television",
  "sofa",
  "bed",
  "microwave",
  "air conditioner",
  "washing machine",
  "books",
  "jewelry",
  "toys",
  "makeup",
  "kitchenware",
  "gaming console",
  "fitness equipment",
  "groceries",
  "bags",
  "accessories",
  "furniture",
  "stationery",
  "car accessories",
  "motorcycle accessories",
  "sporting goods",
  "home decor",
  "healthcare products",
  "office supplies",
  "pet supplies",
  "power tools",
  "gardening tools",
];

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <UserProvider>
        <ProductProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ProductProvider>
      </UserProvider>
    </ThemeProvider>
  </StrictMode>
);
