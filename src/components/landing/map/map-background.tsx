export default function MapBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {/* ใช้ iframe เป็น placeholder map layer
          ตอนนี้ชี้ไปที่ OpenStreetMap เพื่อจำลองแผนที่เต็มจอ */}
      <iframe
        title="Map"
        width="100%"
        height="100%"
        frameBorder="0"
        src="https://www.openstreetmap.org/export/embed.html?bbox=100.4851,13.7431,100.5051,13.7631&layer=mapnik&marker=13.7531,100.4951"
        style={{ filter: "brightness(0.95)" }}
      />
    </div>
  );
}
