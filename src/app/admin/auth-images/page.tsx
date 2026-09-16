import { AuthImagesManager } from "@/components/admin/auth-images/AuthImagesManager";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AuthImagesPage() {
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <AuthImagesManager />
    </div>
  );
}
