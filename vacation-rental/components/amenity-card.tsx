import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Amenity } from "@/types/booking"
import { IconType } from 'react-icons'

interface AmenityCardProps {
  amenity: {
    icon: IconType;
    name: string;
    description: string;
  }
}

export function AmenityCard({ amenity }: AmenityCardProps) {
  const Icon = amenity.icon

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Icon className="w-8 h-8" />
        <CardTitle>{amenity.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{amenity.description}</p>
      </CardContent>
    </Card>
  )
}

