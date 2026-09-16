"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { css } from "styled-system/css";

interface Address {
  id: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface AddressFormProps {
  address?: Address | null;
  onSave: () => void;
  onCancel: () => void;
}

const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });

const requiredMarkStyle = css({ color: "danger", marginLeft: "0.5" });

export default function AddressForm({
  address,
  onSave,
  onCancel,
}: AddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: address?.fullName || "",
    mobile: address?.mobile || "",
    addressLine1: address?.addressLine1 || "",
    addressLine2: address?.addressLine2 || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
    isDefault: address?.isDefault || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = address ? "PUT" : "POST";
      const body = address ? { ...formData, id: address.id } : formData;

      const response = await fetch("/api/user/address", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to save address");
      }

      toast.success(address ? "Address updated!" : "Address added!");
      onSave();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{address ? "Edit Address" : "Add New Address"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className={css({ display: "flex", flexDirection: "column", gap: "5" })}
        >
          <div
            className={css({
              display: "grid",
              gap: "4",
              gridTemplateColumns: "1fr",
              md: { gridTemplateColumns: "1fr 1fr" },
            })}
          >
            <div className={fieldStyle}>
              <Label>
                Full Name<span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                required
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className={fieldStyle}>
              <Label>
                Mobile Number<span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                required
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
                placeholder="9876543210"
                pattern="[0-9]{10}"
              />
            </div>
          </div>

          <div className={fieldStyle}>
            <Label>
              Address Line 1<span className={requiredMarkStyle}>*</span>
            </Label>
            <Input
              required
              value={formData.addressLine1}
              onChange={(e) =>
                setFormData({ ...formData, addressLine1: e.target.value })
              }
              placeholder="House/Flat No., Building Name"
            />
          </div>

          <div className={fieldStyle}>
            <Label>Address Line 2</Label>
            <Input
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData({ ...formData, addressLine2: e.target.value })
              }
              placeholder="Road, Area, Landmark (Optional)"
            />
          </div>

          <div
            className={css({
              display: "grid",
              gap: "4",
              gridTemplateColumns: "1fr",
              sm: { gridTemplateColumns: "1fr 1fr" },
              md: { gridTemplateColumns: "1fr 1fr 1fr" },
            })}
          >
            <div className={fieldStyle}>
              <Label>
                City<span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Mumbai"
              />
            </div>
            <div className={fieldStyle}>
              <Label>
                State<span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                placeholder="Maharashtra"
              />
            </div>
            <div className={fieldStyle}>
              <Label>
                Pincode<span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                required
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                placeholder="400001"
                pattern="[0-9]{6}"
              />
            </div>
          </div>

          <Checkbox
            checked={formData.isDefault}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isDefault: checked })
            }
          >
            Set as default address
          </Checkbox>

          <div
            className={css({
              display: "flex",
              flexDirection: { base: "column-reverse", sm: "row" },
              gap: "2",
              paddingTop: "2",
            })}
          >
            <Button
              type="submit"
              disabled={loading}
              className={css({ flex: { sm: "1" } })}
            >
              {loading ? (
                <>
                  <Loader2 className={css({ h: "4", w: "4", animation: "spin" })} />
                  Saving...
                </>
              ) : (
                "Save Address"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
