import { IconType } from 'react-icons'

export interface Amenity {
  icon: IconType;
  name: string;
  description: string;
}

export interface BookingDetails {
  checkIn: Date
  checkOut: Date
  guests: number
  options: string[]
  couponCode?: string
}

export interface GuestInformation {
  name: string
  nameKana: string
  address: string
  email: string
  phone: string
}

