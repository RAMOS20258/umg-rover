import { useEffect, useMemo, useState } from "react";

const femaleModules = import.meta.glob("../assets/avatar-presets/female/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

const maleModules = import.meta.glob("../assets/avatar-presets/male/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

function sortEntries(modules) {
  return Object.entries(modules)
    .map(([path, src]) => ({
      path,
      src,
      name: path.split("/").pop() || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function imageUrlToDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function AvatarPresetPicker({ onAvatarReady, onAvatarMetaChange }) {
  const femaleOptions = useMemo(() => sortEntries(femaleModules), []);
  const maleOptions = useMemo(() => sortEntries(maleModules), []);

  const [gender, setGender] = useState("female");
  const [selectedSrc, setSelectedSrc] = useState(femaleOptions[0]?.src || null);

  const currentOptions = gender === "female" ? femaleOptions : maleOptions;

  useEffect(() => {
    setSelectedSrc(currentOptions[0]?.src || null);
  }, [gender]);

  useEffect(() => {
    const build = async () => {
      if (!selectedSrc) return;

      try {
        const dataUrl = await imageUrlToDataUrl(selectedSrc);
        onAvatarReady?.(dataUrl);
        onAvatarMetaChange?.({
          type: "preset",
          gender,
          src: selectedSrc,
        });
      } catch (error) {
        console.error("No se pudo convertir el avatar preset:", error);
      }
    };

    build();
  }, [selectedSrc, gender, onAvatarReady, onAvatarMetaChange]);

  return (
    <div className="avatar-preset-picker">
      <div className="avatar-gender-tabs">
        <button
          type="button"
          className={gender === "female" ? "active" : ""}
          onClick={() => setGender("female")}
        >
          👩 Femenino
        </button>

        <button
          type="button"
          className={gender === "male" ? "active" : ""}
          onClick={() => setGender("male")}
        >
          👨 Masculino
        </button>
      </div>

      <div className="avatar-preset-grid">
        {currentOptions.length === 0 ? (
          <div className="auth-error">
            <span>⚠</span> No hay avatares en la carpeta de presets.
          </div>
        ) : (
          currentOptions.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`avatar-preset-card ${selectedSrc === item.src ? "selected" : ""}`}
              onClick={() => setSelectedSrc(item.src)}
              title={item.name}
            >
              <img src={item.src} alt={item.name} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}