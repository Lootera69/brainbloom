import { Suspense } from "react";
import { StorePage } from "@/features/shop/StorePage";
import { ShopLoading } from "./loading";

export default function ShopRoute() {
  return (
    <Suspense fallback={<ShopLoading />}>
      <StorePage />
    </Suspense>
  );
}
