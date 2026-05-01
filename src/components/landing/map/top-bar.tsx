export default function TopBar() {
  return (
    // top bar นี้อยู่เหนือ map ตลอดเวลาและใช้ gradient เพื่อให้อ่าน text บน map ได้ง่ายขึ้น
    <div className="absolute top-0 z-10 w-full bg-gradient-to-b from-black/60 to-transparent p-4 pt-6">
      <div className="flex items-center justify-between text-white">
        <h1 className="text-xl font-bold tracking-wide">ThaiBuddy 🇹🇭</h1>
        <div className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-sm backdrop-blur-sm">
          EN ▾
        </div>
      </div>
    </div>
  );
}
