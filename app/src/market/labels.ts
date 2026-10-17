export function rubro(cat: string): string {
	switch (cat) {
		case "videos":
			return "Videos"
		case "web":
			return "Web"
		case "marca":
			return "Marca"
		default:
			return cat
	}
}

export function oficio(trade: string): string {
	switch (trade) {
		case "alimentos":
			return "comida"
		case "comercio":
			return "pulpería"
		case "servicios":
			return "servicios"
		case "oficios":
			return "oficio"
		case "campo":
			return "campo"
		case "web":
			return "web"
		case "video":
		case "videos":
			return "videos"
		case "marca":
			return "marca"
		case "plataforma":
			return "mesa"
		case "libros":
			return "libros"
		case "fotos":
			return "fotos"
		case "electricidad":
			return "luz"
		case "whatsapp":
			return "WhatsApp"
		case "cañerias":
			return "cañerías"
		case "redes":
			return "redes"
		case "pintura":
			return "pintura"
		case "rotulos":
			return "rótulos"
		case "menu":
			return "menú"
		default:
			return trade
	}
}

export const OFICIO_OPCIONES: { id: string; label: string }[] = [
	{ id: "video", label: "Videos" },
	{ id: "web", label: "Páginas" },
	{ id: "marca", label: "Marca" },
	{ id: "fotos", label: "Fotos" },
	{ id: "libros", label: "Libros y planilla" },
	{ id: "electricidad", label: "Luz" },
	{ id: "whatsapp", label: "WhatsApp" },
	{ id: "cañerias", label: "Cañerías" },
	{ id: "redes", label: "Redes" },
	{ id: "pintura", label: "Pintura" },
	{ id: "rotulos", label: "Rótulos" },
	{ id: "menu", label: "Menú" },
]

export const RUBRO_OPCIONES: { id: string; label: string }[] = [
	{ id: "alimentos", label: "Comida" },
	{ id: "comercio", label: "Pulpería / venta" },
	{ id: "servicios", label: "Servicios" },
	{ id: "oficios", label: "Taller" },
	{ id: "campo", label: "Campo" },
]
