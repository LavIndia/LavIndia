"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";

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

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
}

export default function AddressCard({
  address,
  onEdit,
  onDelete,
}: AddressCardProps) {
  return (
    <Card className="relative">
      {address.isDefault && (
        <Badge className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500">
          Default
        </Badge>
      )}
      <CardContent className="pt-6">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{address.fullName}</h3>
          <p className="text-sm text-gray-600">{address.mobile}</p>
          <p className="text-sm">
            {address.addressLine1}
            {address.addressLine2 && `, ${address.addressLine2}`}
          </p>
          <p className="text-sm">
            {address.city}, {address.state} - {address.pincode}
          </p>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(address)}
            className="flex-1"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(address.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
