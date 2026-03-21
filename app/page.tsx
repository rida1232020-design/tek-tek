"use client"

import { useState, useEffect, useRef } from "react"
import { trpc } from "@/lib/trpc"
import { usePiAuth } from "@/contexts/pi-auth-context"
import { usePiPayment } from "@/hooks/usePiPayment"

type Driver = {
  id: number
  name: string
  rating: number
  car: string
  color: string
  plate: string
  location: { lat: number; lng: number; address: string }
  distance: string
  eta: string
  price: string
  online: boolean
  phone: string
}

type Screen = "selection" | "customer" | "driver"
type NotificationType = "info" | "success" | "error"
type Language = "ar" | "en"

type LocationCoords = {
  lat: number
  lng: number
  address: string
}

const translations = {
  ar: {
    appName: "تك تك",
    appSlogan: "خدمة نقل حضرية ذكية",
    chooseOption: "اختر الخدمة",
    bookRide: "حجز رحلة",
    bookRideDesc: "احصل على رحلة آمنة في دقائق",
    addDriver: "سائق",
    addDriverDesc: "انضم كسائق شريك",
    back: "رجوع",
    bookYourRide: "حجز رحلتك",
    pickupLocation: "نقطة الانطلاق",
    selectPickup: "حدد موقعك على الخريطة",
    destination: "الوجهة",
    selectDestination: "إلى أين تريد الذهاب؟",
    payment: "الدفع",
    paymentCash: "نقداً عند الوصول",
    paymentPi: "الدفع بعملة π",
    paymentPiDesc: "ادفع بـ Pi Network",
    paymentCashDesc: "نقداً عند الوصول",
    piNetwork: "Pi Network",
    piPayment: "الدفع بعملة π",
    piPaying: "جاري الدفع بـ Pi...",
    piSuccess: "تم الدفع بنجاح بـ π",
    piCancelled: "تم إلغاء الدفع",
    piError: "فشل الدفع، حاول مجدداً",
    selectPayment: "اختر طريقة الدفع",
    searchDriver: "ابحث عن سائق",
    searching: "جاري البحث...",
    availableDrivers: "السائقون المتاحون",
    noDrivers: "لا يوجد سائقين متاحين",
    tryAnother: "جرب منطقة أخرى",
    selectDriver: "اختر",
    addNewDriver: "إضافة سائق",
    driverData: "بيانات السائق",
    driverName: "اسم السائق",
    phone: "رقم الهاتف",
    vehicleType: "نوع المركبة",
    vehicleColor: "اللون",
    workArea: "منطقة العمل",
    add: "إضافة",
    driversList: "السائقون",
    edit: "تعديل",
    delete: "حذف",
    chatWith: "محادثة",
    typeMessage: "اكتب رسالتك...",
    online: "متصل",
    offline: "غير متصل",
    welcome: "مرحباً بك في تك تك",
    selectPickupFirst: "حدد موقعك أولاً",
    selectDestinationFirst: "حدد وجهتك",
    sameLocation: "الموقعان متطابقان",
    searchingNearby: "البحث عن سائقين قريبين...",
    driversFound: "سائق متاح",
    connectingDriver: "جاري الاتصال بالسائق",
    tripConfirmed: "تم التأكيد! السائق في الطريق",
    driverAdded: "تم إضافة السائق",
    driverDeleted: "تم حذف السائق",
    confirmDelete: "تأكيد الحذف؟",
    enterName: "الاسم الكامل",
    enterPhone: "+1234567890",
    enterVehicle: "مثال: Toyota Corolla",
    selectColor: "اختر اللون",
    selectArea: "اختر المنطقة",
    white: "أبيض",
    black: "أسود",
    silver: "فضي",
    gray: "رمادي",
    blue: "أزرق",
    red: "أحمر",
    selected: "محدد",
    clickMap: "انقر على الخريطة",
    currentLocation: "موقعي",
    locationDetected: "تم تحديد الموقع",
    min: "دقيقة",
    away: "بعيد",
  },
  en: {
    appName: "TikTik",
    appSlogan: "Smart Urban Mobility",
    chooseOption: "Choose Service",
    bookRide: "Book a Ride",
    bookRideDesc: "Get a safe ride in minutes",
    addDriver: "Driver",
    addDriverDesc: "Join as partner driver",
    back: "Back",
    bookYourRide: "Book Your Ride",
    pickupLocation: "Pickup",
    selectPickup: "Select location on map",
    destination: "Destination",
    selectDestination: "Where to?",
    payment: "Payment",
    paymentCash: "Cash on arrival",
    paymentPi: "Pay with π",
    paymentPiDesc: "Pay via Pi Network",
    paymentCashDesc: "Cash on arrival",
    piNetwork: "Pi Network",
    piPayment: "Pay with π",
    piPaying: "Paying with Pi...",
    piSuccess: "Payment successful with π",
    piCancelled: "Payment cancelled",
    piError: "Payment failed, try again",
    selectPayment: "Select payment method",
    searchDriver: "Find Driver",
    searching: "Searching...",
    availableDrivers: "Available Drivers",
    noDrivers: "No drivers available",
    tryAnother: "Try another area",
    selectDriver: "Select",
    addNewDriver: "Add Driver",
    driverData: "Driver Info",
    driverName: "Driver Name",
    phone: "Phone",
    vehicleType: "Vehicle",
    vehicleColor: "Color",
    workArea: "Work Area",
    add: "Add",
    driversList: "Drivers",
    edit: "Edit",
    delete: "Delete",
    chatWith: "Chat",
    typeMessage: "Type message...",
    online: "Online",
    offline: "Offline",
    welcome: "Welcome to TikTik",
    selectPickupFirst: "Select pickup first",
    selectDestinationFirst: "Select destination",
    sameLocation: "Locations are the same",
    searchingNearby: "Searching nearby drivers...",
    driversFound: "drivers available",
    connectingDriver: "Connecting driver",
    tripConfirmed: "Confirmed! Driver on the way",
    driverAdded: "Driver added",
    driverDeleted: "Driver deleted",
    confirmDelete: "Confirm delete?",
    enterName: "Full name",
    enterPhone: "+1234567890",
    enterVehicle: "Example: Toyota Corolla",
    selectColor: "Select color",
    selectArea: "Select area",
    white: "White",
    black: "Black",
    silver: "Silver",
    gray: "Gray",
    blue: "Blue",
    red: "Red",
    selected: "Selected",
    clickMap: "Click on map",
    currentLocation: "My Location",
    locationDetected: "Location detected",
    min: "min",
    away: "away",
  },
}

export default function TikTikPremium() {
  const [language, setLanguage] = useState<Language>("en")
  const [screen, setScreen] = useState<Screen>("selection")
  const [pickupLocation, setPickupLocation] = useState<LocationCoords | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<LocationCoords | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  const pickupMapRef = useRef<HTMLDivElement>(null)
  const destinationMapRef = useRef<HTMLDivElement>(null)
  const pickupMapInstance = useRef<any>(null)
  const destinationMapInstance = useRef<any>(null)
  const pickupMarker = useRef<any>(null)
  const destinationMarker = useRef<any>(null)

  const { data: dbDrivers, refetch: fetchDrivers } = trpc.drivers.getAvailable.useQuery({}, { enabled: false })
  const createTripMutation = trpc.trips.create.useMutation()

  const drivers: Driver[] = (dbDrivers || []).map((d: any) => ({
    id: d.driver.id,
    name: d.user.name || "Unknown",
    rating: Number(d.driver.averageRating) || 5.0,
    car: `${d.driver.vehicleMake} ${d.driver.vehicleModel}`,
    color: d.driver.vehicleColor || "White",
    plate: d.driver.plateNumber,
    location: { lat: Number(d.driver.currentLat || 0), lng: Number(d.driver.currentLng || 0), address: "Nearby" },
    distance: "1.2 km",
    eta: "3",
    price: "5", // In cash/DZD
    online: d.driver.isOnline ?? false,
    phone: d.user.phone || "",
  }))

  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "customer" | "driver"; text: string }>>([])
  const [chatInput, setChatInput] = useState("")
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pi">("cash")
  const [piPaymentStatus, setPiPaymentStatus] = useState<"idle" | "processing" | "success" | "cancelled" | "error">("idle")

  const { payWithPi, isLoading: piIsLoading } = usePiPayment()

  const t = translations[language]
  const isRTL = language === "ar"

  const showNotification = (message: string, type: NotificationType = "info") => {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i><span>${message}</span>`
    document.body.appendChild(notification)
    setTimeout(() => {
      notification.style.opacity = "0"
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }

  useEffect(() => {
    // Show welcome message only on first load
    const hasShownWelcome = sessionStorage.getItem("welcomeShown")
    if (!hasShownWelcome) {
      setTimeout(() => {
        showNotification(t.welcome, "success")
        sessionStorage.setItem("welcomeShown", "true")
      }, 500)
    }
  }, [])

  // Load Leaflet
  useEffect(() => {
    if (typeof window !== "undefined" && !window.L) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)

      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    } else if (window.L) {
      setMapLoaded(true)
    }
  }, [])

  const initMap = (mapRef: any, mapInstance: any, marker: any, location: LocationCoords | null, fallbackLocation?: LocationCoords | null) => {
    if (!mapLoaded || !mapRef.current || mapInstance.current || !window.L) return

    // Use location, then fallbackLocation (pickup area), then default coords
    const defaultCenter = location || fallbackLocation || { lat: 31.9454, lng: 35.9284, address: "" }
    const map = window.L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([defaultCenter.lat, defaultCenter.lng], 14)

    // Using clear and bright map tiles
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: ""
    }).addTo(map)

    mapInstance.current = map

    if (location) {
      const markerElement = window.L.divIcon({
        className: "custom-marker",
        html: `<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #ffcc00, #ffd633); border-radius: 50%; border: 3px solid #0a0a0f; box-shadow: 0 0 12px rgba(255,204,0,0.5);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      marker.current = window.L.marker([location.lat, location.lng], { icon: markerElement }).addTo(map)
    }

    map.on("click", async (e: any) => {
      const { lat, lng } = e.latlng
      if (marker.current) map.removeLayer(marker.current)

      const markerElement = window.L.divIcon({
        className: "custom-marker",
        html: `<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #ffcc00, #ffd633); border-radius: 50%; border: 3px solid #0a0a0f; box-shadow: 0 0 12px rgba(255,204,0,0.5);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      marker.current = window.L.marker([lat, lng], { icon: markerElement }).addTo(map)

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        const data = await response.json()
        const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`

        if (mapRef === pickupMapRef) {
          setPickupLocation({ lat, lng, address })
          showNotification(t.locationDetected, "success")
        } else {
          setDestinationLocation({ lat, lng, address })
          showNotification(t.locationDetected, "success")
        }
      } catch (error) {
        const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        if (mapRef === pickupMapRef) {
          setPickupLocation({ lat, lng, address })
        } else {
          setDestinationLocation({ lat, lng, address })
        }
      }
    })
  }

  useEffect(() => {
    if (screen === "customer" && mapLoaded) {
      setTimeout(() => {
        if (!pickupMapInstance.current) initMap(pickupMapRef, pickupMapInstance, pickupMarker, pickupLocation)
        // Destination map centers on pickup location if no destination yet (shows rider's area)
        if (!destinationMapInstance.current) initMap(destinationMapRef, destinationMapInstance, destinationMarker, destinationLocation, pickupLocation)
      }, 100)
    }
  }, [screen, mapLoaded])

  const applyLocationToMap = async (lat: number, lng: number, isPickup: boolean) => {
    // جلب العنوان من Nominatim
    let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": language === "ar" ? "ar" : "en" } }
      )
      const data = await response.json()
      address = data.display_name || address
    } catch (_) { /* استخدام الإحداثيات كعنوان */ }

    const markerHtml = `<div style="width:24px;height:24px;background:linear-gradient(135deg,#ffcc00,#ffd633);border-radius:50%;border:3px solid #0a0a0f;box-shadow:0 0 12px rgba(255,204,0,0.5);"></div>`
    const markerIcon = window.L?.divIcon({ className: "custom-marker", html: markerHtml, iconSize: [24, 24], iconAnchor: [12, 12] })

    if (isPickup) {
      setPickupLocation({ lat, lng, address })
      if (pickupMapInstance.current && window.L) {
        pickupMapInstance.current.setView([lat, lng], 15)
        if (pickupMarker.current) pickupMapInstance.current.removeLayer(pickupMarker.current)
        pickupMarker.current = window.L.marker([lat, lng], { icon: markerIcon }).addTo(pickupMapInstance.current)
      }
    } else {
      setDestinationLocation({ lat, lng, address })
      if (destinationMapInstance.current && window.L) {
        destinationMapInstance.current.setView([lat, lng], 15)
        if (destinationMarker.current) destinationMapInstance.current.removeLayer(destinationMarker.current)
        destinationMarker.current = window.L.marker([lat, lng], { icon: markerIcon }).addTo(destinationMapInstance.current)
      }
    }
    showNotification(t.locationDetected, "success")
  }

  const getCurrentLocation = (isPickup: boolean) => {
    if (!("geolocation" in navigator)) {
      showNotification(
        language === "ar" ? "المتصفح لا يدعم تحديد الموقع" : "Geolocation not supported by this browser",
        "error"
      )
      return
    }

    showNotification(
      language === "ar" ? "جاري تحديد موقعك..." : "Detecting your location...",
      "info"
    )

    const onSuccess = async (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = position.coords
      await applyLocationToMap(lat, lng, isPickup)
    }

    const onError = (error: GeolocationPositionError, isRetry = false) => {
      if (error.code === 1) {
        // رُفض الإذن - نعطي إرشادات واضحة
        showNotification(
          language === "ar"
            ? "❌ الإذن مرفوض. افتح إعدادات المتصفح (🔒 بجانب الرابط) ثم فعّل 'الموقع'"
            : "❌ Permission denied. Click the 🔒 icon in the address bar → Allow Location",
          "error"
        )
      } else if (error.code === 2) {
        if (!isRetry) {
          // محاولة ثانية بدقة أقل (أسرع وأكثر نجاحاً داخل البيئات المقيدة)
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            (err) => onError(err, true),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        } else {
          showNotification(
            language === "ar"
              ? "تعذّر تحديد الموقع. تأكد من تفعيل GPS أو حدد الموقع يدوياً على الخريطة"
              : "Location unavailable. Enable GPS or pick location manually on the map",
            "error"
          )
        }
      } else if (error.code === 3) {
        if (!isRetry) {
          // انتهت المهلة - نحاول بإعدادات أكثر تساهلاً
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            (err) => onError(err, true),
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
          )
        } else {
          showNotification(
            language === "ar"
              ? "انتهت المهلة. حاول مرة أخرى أو حدد الموقع يدوياً"
              : "Timeout. Please try again or pick manually on the map",
            "error"
          )
        }
      }
    }

    // المحاولة الأولى: دقة عالية
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => onError(err, false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const searchForDrivers = async () => {
    if (!pickupLocation) {
      showNotification(t.selectPickupFirst, "error")
      return
    }
    if (!destinationLocation) {
      showNotification(t.selectDestinationFirst, "error")
      return
    }
    if (pickupLocation.lat === destinationLocation.lat && pickupLocation.lng === destinationLocation.lng) {
      showNotification(t.sameLocation, "error")
      return
    }

    setSearching(true)
    showNotification(t.searchingNearby, "info")

    // Fetch live drivers from the database
    await fetchDrivers()

    setSearching(false)
    setShowResults(true)
    showNotification(`${t.driversFound}`, "success")
  }

  const selectDriver = async (driverId: number) => {
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) return
    setCurrentDriver(driver)

    if (paymentMethod === "pi") {
      // Pi Payment Flow
      showNotification(
        language === "ar" ? "جاري فتح Pi Wallet..." : "Opening Pi Wallet...",
        "info"
      )
      setPiPaymentStatus("processing")

      // Fixed Pi payment amount: 0.02 π (sandbox/testnet amount)
      const piAmount = 0.02
      const result = await payWithPi(
        piAmount,
        language === "ar"
          ? `تك تك - رحلة من ${pickupLocation?.address?.substring(0, 30)} إلى ${destinationLocation?.address?.substring(0, 30)}`
          : `TekTek ride from ${pickupLocation?.address?.substring(0, 30)} to ${destinationLocation?.address?.substring(0, 30)}`,
        { tripId: 0, driverId }
      )

      if (!result.success) {
        if (result.error === "Payment cancelled by user") {
          setPiPaymentStatus("cancelled")
          showNotification(t.piCancelled, "error")
        } else {
          setPiPaymentStatus("error")
          showNotification(t.piError, "error")
        }
        return
      }

      setPiPaymentStatus("success")
      showNotification(t.piSuccess, "success")
    } else {
      showNotification(`${t.connectingDriver} ${driver.name}...`, "info")
    }

    // Create the trip in the backend
    try {
      await createTripMutation.mutateAsync({
        pickupLat: pickupLocation!.lat,
        pickupLng: pickupLocation!.lng,
        pickupAddress: pickupLocation!.address,
        destLat: destinationLocation!.lat,
        destLng: destinationLocation!.lng,
        destAddress: destinationLocation!.address,
        price: Number(driver.price) || 0,
      })

      showNotification(t.tripConfirmed, "success")
      setTimeout(() => openChat(driver), 800)
    } catch (e) {
      showNotification("Failed to create trip", "error")
    }
  }

  const openChat = (driver: Driver) => {
    setChatMessages([
      { sender: "driver", text: `Hello! I'm ${driver.name}, on my way to you!` },
      { sender: "driver", text: `ETA: ${driver.eta} ${t.min}` },
    ])
    setChatOpen(true)
  }

  const sendMessage = () => {
    if (!chatInput.trim()) return
    setChatMessages([...chatMessages, { sender: "customer", text: chatInput }])
    setChatInput("")
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: "driver", text: "Got it, see you soon!" }])
    }, 1000)
  }

  return (
    <div className={`min-h-screen ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-yellow to-accent-yellow-bright flex items-center justify-center shadow-yellow">
              <i className="fas fa-taxi text-background text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text leading-none">{t.appName}</h1>
              <p className="text-xs text-foreground-muted">{t.appSlogan}</p>
            </div>
          </div>
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="px-4 py-2 rounded-lg btn-secondary text-sm font-semibold"
          >
            {language === "ar" ? "EN" : "AR"}
          </button>
        </div>
      </header>

      {/* Selection Screen */}
      {screen === "selection" && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-8 animate-fade-in">
          <div className="w-full max-w-md space-y-6">
            <div
              className="card card-accent p-8 cursor-pointer group"
              onClick={() => setScreen("customer")}
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-yellow to-accent-yellow-bright flex items-center justify-center shadow-yellow group-hover:scale-110 transition-transform">
                  <i className="fas fa-location-dot text-background text-2xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{t.bookRide}</h3>
                  <p className="text-sm text-foreground-muted">{t.bookRideDesc}</p>
                </div>
                <i className={`fas fa-chevron-${isRTL ? 'left' : 'right'} text-accent-yellow text-lg`}></i>
              </div>
            </div>

            <div
              className="card p-8 cursor-pointer group"
              onClick={() => setScreen("driver")}
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border-bright flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-user-tie text-accent-yellow text-2xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{t.addDriver}</h3>
                  <p className="text-sm text-foreground-muted">{t.addDriverDesc}</p>
                </div>
                <i className={`fas fa-chevron-${isRTL ? 'left' : 'right'} text-foreground-muted text-lg`}></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Screen */}
      {screen === "customer" && (
        <div className="min-h-screen pt-20 pb-8 animate-fade-in">
          <div className="max-w-2xl mx-auto px-4 space-y-4">
            <button onClick={() => { setScreen("selection"); setShowResults(false); }} className="btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 mb-4">
              <i className={`fas fa-chevron-${isRTL ? 'right' : 'left'}`}></i>
              <span className="font-semibold">{t.back}</span>
            </button>

            <div className="card glass-elevated p-6 space-y-6">
              <h2 className="text-2xl font-bold">{t.bookYourRide}</h2>

              {/* Pickup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                    <i className="fas fa-circle text-accent-yellow text-xs"></i>
                    {t.pickupLocation}
                  </label>
                  <button
                    onClick={() => getCurrentLocation(true)}
                    className="text-sm text-accent-yellow font-semibold flex items-center gap-2 hover:text-accent-yellow-bright transition-colors"
                    title={language === "ar" ? "استخدم موقعي الحالي" : "Use my current location"}
                  >
                    <i className="fas fa-crosshairs animate-pulse"></i>
                    {t.currentLocation}
                  </button>
                </div>
                {pickupLocation && (
                  <div className="glass p-3 rounded-xl">
                    <p className="text-sm text-foreground-muted line-clamp-1">{pickupLocation.address}</p>
                  </div>
                )}
                <div ref={pickupMapRef} className="h-48 rounded-xl overflow-hidden border border-border-bright"></div>
                <div className="space-y-1">
                  <p className="text-xs text-foreground-muted flex items-center gap-2">
                    <i className="fas fa-info-circle text-accent-yellow"></i>
                    {t.clickMap}
                  </p>
                  <p className="text-xs text-foreground-muted/70">
                    {language === "ar"
                      ? "أو اضغط على 'الموقع الحالي' أعلاه لتحديد موقعك تلقائياً"
                      : "Or click 'Current Location' above to detect automatically"}
                  </p>
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                  <i className="fas fa-location-dot text-danger text-sm"></i>
                  {t.destination}
                </label>
                {destinationLocation && (
                  <div className="glass p-3 rounded-xl">
                    <p className="text-sm text-foreground-muted line-clamp-1">{destinationLocation.address}</p>
                  </div>
                )}
                <div ref={destinationMapRef} className="h-48 rounded-xl overflow-hidden border border-border-bright"></div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                  <i className="fas fa-wallet text-accent-yellow text-xs"></i>
                  {t.selectPayment}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cash Option */}
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === "cash"
                        ? "border-green-500 bg-green-500/10"
                        : "border-border-bright glass hover:border-green-500/50"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "cash" ? "bg-green-500" : "bg-surface-elevated"
                      }`}>
                      <i className={`fas fa-money-bill-wave text-lg ${paymentMethod === "cash" ? "text-white" : "text-green-400"
                        }`}></i>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{language === "ar" ? "نقداً" : "Cash"}</p>
                      <p className="text-xs text-foreground-muted">{t.paymentCashDesc}</p>
                    </div>
                    {paymentMethod === "cash" && (
                      <span className="badge badge-success text-xs">{t.selected}</span>
                    )}
                  </button>

                  {/* Pi Network Option */}
                  <button
                    onClick={() => setPaymentMethod("pi")}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === "pi"
                        ? "border-accent-yellow bg-accent-yellow/10"
                        : "border-border-bright glass hover:border-accent-yellow/50"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "pi" ? "bg-gradient-to-br from-accent-yellow to-accent-yellow-bright" : "bg-surface-elevated"
                      }`}>
                      <span className={`text-xl font-black ${paymentMethod === "pi" ? "text-background" : "text-accent-yellow"
                        }`}>π</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">Pi Network</p>
                      <p className="text-xs text-foreground-muted">{t.paymentPiDesc}</p>
                    </div>
                    {paymentMethod === "pi" && (
                      <span className="badge badge-yellow text-xs">{t.selected}</span>
                    )}
                  </button>
                </div>

                {/* Pi payment status indicator */}
                {piPaymentStatus === "processing" && (
                  <div className="glass p-3 rounded-xl flex items-center gap-3 border border-accent-yellow/30">
                    <div className="loading-spinner"></div>
                    <p className="text-sm text-accent-yellow font-semibold">{t.piPaying}</p>
                  </div>
                )}
                {piPaymentStatus === "success" && (
                  <div className="glass p-3 rounded-xl flex items-center gap-3 border border-green-500/30">
                    <i className="fas fa-check-circle text-green-400 text-lg"></i>
                    <p className="text-sm text-green-400 font-semibold">{t.piSuccess}</p>
                  </div>
                )}
                {piPaymentStatus === "error" && (
                  <div className="glass p-3 rounded-xl flex items-center gap-3 border border-red-500/30">
                    <i className="fas fa-times-circle text-red-400 text-lg"></i>
                    <p className="text-sm text-red-400 font-semibold">{t.piError}</p>
                  </div>
                )}
              </div>

              <button
                onClick={searchForDrivers}
                disabled={searching || piIsLoading}
                className="btn-primary w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3"
              >
                {searching ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>{t.searching}</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-magnifying-glass"></i>
                    <span>{t.searchDriver}</span>
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {showResults && (
              <div className="space-y-4 animate-slide-up">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <i className="fas fa-users text-accent-yellow"></i>
                  {t.availableDrivers}
                </h3>
                {drivers.map((driver) => (
                  <div key={driver.id} className="card glass p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-yellow to-accent-yellow-bright flex items-center justify-center shadow-yellow">
                      <span className="text-background text-xl font-bold">{driver.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold truncate">{driver.name}</h4>
                        <span className="badge badge-success text-xs">
                          <i className="fas fa-circle text-[8px]"></i>
                          {t.online}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <span className="flex items-center gap-1">
                          <i className="fas fa-star text-accent-yellow text-xs"></i>
                          {driver.rating}
                        </span>
                        <span>•</span>
                        <span>{driver.car}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted">
                        <span className="flex items-center gap-1">
                          <i className="fas fa-clock"></i>
                          {driver.eta} {t.min}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="fas fa-route"></i>
                          {driver.distance} {t.away}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent-yellow mb-1">
                        {paymentMethod === "pi" ? "0.02π" : `${driver.price} ${language === "ar" ? "دج" : "DZD"}`}
                      </div>
                      <button onClick={() => selectDriver(driver.id)} className="btn-primary px-6 py-2 rounded-lg text-sm font-bold whitespace-nowrap">
                        {t.selectDriver}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver Screen */}
      {screen === "driver" && (
        <div className="min-h-screen pt-20 pb-8 animate-fade-in">
          <div className="max-w-2xl mx-auto px-4">
            <button onClick={() => setScreen("selection")} className="btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 mb-6">
              <i className={`fas fa-chevron-${isRTL ? 'right' : 'left'}`}></i>
              <span className="font-semibold">{t.back}</span>
            </button>

            <div className="card glass-elevated p-6">
              <h2 className="text-2xl font-bold mb-6">{t.addNewDriver}</h2>
              <div className="space-y-4">
                <input type="text" placeholder={t.enterName} className="input-field w-full" />
                <input type="tel" placeholder={t.enterPhone} className="input-field w-full" />
                <input type="text" placeholder={t.enterVehicle} className="input-field w-full" />
                <button className="btn-primary w-full py-4 rounded-xl text-lg font-bold">
                  <i className="fas fa-plus-circle mr-2"></i>
                  {t.add}
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-xl font-bold">{t.driversList}</h3>
              {drivers.map((driver) => (
                <div key={driver.id} className="card glass p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-yellow to-accent-yellow-bright flex items-center justify-center">
                    <span className="text-background text-lg font-bold">{driver.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{driver.name}</h4>
                    <p className="text-sm text-foreground-muted truncate">{driver.car}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary px-4 py-2 rounded-lg text-sm">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 transition-colors">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatOpen && currentDriver && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setChatOpen(false)}>
          <div className="w-full max-w-2xl glass-elevated rounded-t-3xl animate-slide-up max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-bright flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-yellow to-accent-yellow-bright flex items-center justify-center">
                  <span className="text-background text-lg font-bold">{currentDriver.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-bold">{currentDriver.name}</h3>
                  <p className="text-sm text-success flex items-center gap-1">
                    <i className="fas fa-circle text-[6px]"></i>
                    {t.online}
                  </p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-10 h-10 rounded-full btn-secondary flex items-center justify-center">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${msg.sender === "customer" ? "bg-accent-yellow text-background" : "glass"}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border-bright flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder={t.typeMessage}
                className="input-field flex-1"
              />
              <button onClick={sendMessage} className="btn-primary w-12 h-12 rounded-full flex items-center justify-center">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
