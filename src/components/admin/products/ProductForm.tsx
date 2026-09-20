"use client";

import { ProductFormActionBar } from "@/components/admin/products/ProductFormActionBar";
import { ProductBasicsCard } from "@/components/admin/products/ProductBasicsCard";
import { ProductPricingCard } from "@/components/admin/products/ProductPricingCard";
import { ProductImagesCard } from "@/components/admin/products/ProductImagesCard";
import { ProductOptionsCard } from "@/components/admin/products/ProductOptionsCard";
import { ProductVariantsCard } from "@/components/admin/products/ProductVariantsCard";
import { ProductStatusSidebar } from "@/components/admin/products/ProductStatusSidebar";
import { FormErrorDialog } from "@/components/admin/products/FormErrorDialog";
import { useProductForm } from "@/components/admin/products/use-product-form";
import type { ProductFormProps } from "@/components/admin/products/product-form-types";
import {
  layoutStyle,
  mainColumnStyle,
} from "@/components/admin/products/product-form.styles";
import { css } from "styled-system/css";

/**
 * Create or edit a product.
 *
 * Composition only — the state and the save live in useProductForm, and each
 * card owns its own markup. The cards are in the order the work happens:
 * what the product is, what it costs, the options it comes in, the variants
 * those options produce, and finally its images — filed by option value, so
 * the option values have to exist first.
 */

const fullWidthStyle = css({ gridColumn: "1 / -1" });

export function ProductForm({ product, categories, stockByVariant = {} }: ProductFormProps) {
  const form = useProductForm(product);

  return (
    <form
      ref={form.formRef}
      onSubmit={(e) => e.preventDefault()}
      className={layoutStyle}
    >
      <div className={fullWidthStyle}>
        <ProductFormActionBar
          name={form.formData.name}
          isPublished={form.formData.isPublished}
          isExistingProduct={Boolean(product)}
          loading={form.loading}
          savingAction={form.savingAction}
          onCancel={() => form.router.push("/admin/products")}
          onSave={form.handleSave}
        />
      </div>

      <div className={mainColumnStyle}>
        <ProductBasicsCard
          formData={form.formData}
          categories={categories}
          materials={form.curatedOptions.material}
          onChange={form.handleChange}
        />

        <ProductPricingCard formData={form.formData} onChange={form.handleChange} />

        <ProductOptionsCard
          optionValues={form.optionValues}
          curatedOptions={form.curatedOptions}
          onAddOptionValue={form.addOptionValue}
          onRemoveOptionValue={form.removeOptionValue}
          onGenerateVariants={form.generateVariants}
          onAddBlankVariant={form.addBlankVariant}
        />

        <ProductVariantsCard
          variants={form.variants}
          images={form.images}
          basePrice={form.formData.price}
          stockByVariant={stockByVariant}
          onUpdateVariant={form.updateVariant}
          onRemoveVariant={form.removeVariant}
        />

        <ProductImagesCard
          images={form.images}
          variants={form.variants}
          imagesInGroup={form.imagesInGroup}
          setImagesInGroup={form.setImagesInGroup}
          moveImage={form.moveImage}
          productName={form.formData.name}
          categoryId={form.formData.categoryId}
          onError={(message) => form.reportError(message, "Image not uploaded")}
        />
      </div>

      <ProductStatusSidebar
        checklist={form.checklist}
        readyToPublish={form.readyToPublish}
        formData={form.formData}
        onChange={form.handleChange}
      />

      <FormErrorDialog error={form.error} onClose={form.clearError} />
    </form>
  );
}
