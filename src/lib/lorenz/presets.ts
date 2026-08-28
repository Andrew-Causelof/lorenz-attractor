export type LorenzPreset = {
  id: string;
  label: string;
  blurb: string;
  sigma: number;
  rho: number;
  beta: number;
};

export const PRESETS: LorenzPreset[] = [
  {
    id: "classic",
    label: "Классика",
    blurb: "Странный аттрактор, ρ = 28",
    sigma: 10,
    rho: 28,
    beta: 8 / 3,
  },
  {
    id: "quiet",
    label: "Покой",
    blurb: "Сходится к неподвижной точке",
    sigma: 10,
    rho: 14,
    beta: 8 / 3,
  },
  {
    id: "edge",
    label: "Порог",
    blurb: "Бифуркация Хопфа, ρ ≈ 24.74",
    sigma: 10,
    rho: 24.74,
    beta: 8 / 3,
  },
  {
    id: "period",
    label: "Период",
    blurb: "Устойчивый предельный цикл",
    sigma: 10,
    rho: 99.96,
    beta: 8 / 3,
  },
  {
    id: "wild",
    label: "Плотность",
    blurb: "Более заполненное притяжение",
    sigma: 16,
    rho: 45,
    beta: 4,
  },
];
