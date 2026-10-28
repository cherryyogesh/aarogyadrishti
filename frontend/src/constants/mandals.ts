export interface MandalItem {
  id: string;
  name: string;
  nameTe: string;
  aliases: string[];
}

export const ASR_DISTRICT_MANDALS: MandalItem[] = [
  {
    id: 'Ananthagiri',
    name: 'Ananthagiri',
    nameTe: 'అనంతగిరి',
    aliases: ['Ananthagiri', 'Anantagiri']
  },
  {
    id: 'Araku Valley',
    name: 'Araku Valley',
    nameTe: 'అరకు లోయ',
    aliases: ['Araku Valley', 'Araku', 'Arakuvalley']
  },
  {
    id: 'Chintapalle',
    name: 'Chintapalle',
    nameTe: 'చింతపల్లి',
    aliases: ['Chintapalle', 'Chintapalli']
  },
  {
    id: 'Dumbriguda',
    name: 'Dumbriguda',
    nameTe: 'డుంబ్రిగుడ',
    aliases: ['Dumbriguda']
  },
  {
    id: 'G. Madugula (Ganagaraju Madugula)',
    name: 'G. Madugula (Ganagaraju Madugula)',
    nameTe: 'జి. మాడుగుల (గంగరాజు మాడుగుల)',
    aliases: ['G. Madugula', 'Ganagaraju Madugula', 'G.Madugula', 'G Madugula']
  },
  {
    id: 'Gudem Kotha Veedhi (G.K. Veedhi)',
    name: 'Gudem Kotha Veedhi (G.K. Veedhi)',
    nameTe: 'గూడెం కొత్త వీధి (జి.కె. వీధి)',
    aliases: ['Gudem Kotha Veedhi', 'G.K. Veedhi', 'GK Veedhi', 'G.K.Veedhi', 'Gudem Kothaveedhi']
  },
  {
    id: 'Hukumpeta',
    name: 'Hukumpeta',
    nameTe: 'హుకుంపేట',
    aliases: ['Hukumpeta', 'Hukumpet']
  },
  {
    id: 'Koyyuru',
    name: 'Koyyuru',
    nameTe: 'కొయ్యూరు',
    aliases: ['Koyyuru', 'Koyyur']
  },
  {
    id: 'Munchingi Puttu',
    name: 'Munchingi Puttu',
    nameTe: 'ముంచంగిపుట్టు',
    aliases: ['Munchingi Puttu', 'Munchingiputtu', 'Munchingput']
  },
  {
    id: 'Paderu',
    name: 'Paderu',
    nameTe: 'పాడేరు',
    aliases: ['Paderu']
  },
  {
    id: 'Peda Bayalu',
    name: 'Peda Bayalu',
    nameTe: 'పెదబయలు',
    aliases: ['Peda Bayalu', 'Pedabayalu']
  }
];

export function matchMandal(mandalName?: string | null, filterMandal?: string | null): boolean {
  if (!filterMandal || filterMandal === 'all') return true;
  if (!mandalName) return false;

  const mLow = mandalName.trim().toLowerCase();
  const fLow = filterMandal.trim().toLowerCase();

  if (mLow === fLow) return true;

  const target = ASR_DISTRICT_MANDALS.find(
    m => m.id.toLowerCase() === fLow || m.name.toLowerCase() === fLow || m.aliases.some(a => a.toLowerCase() === fLow)
  );

  if (target) {
    if (target.name.toLowerCase().includes(mLow) || mLow.includes(target.id.toLowerCase())) return true;
    return target.aliases.some(a => mLow.includes(a.toLowerCase()) || a.toLowerCase().includes(mLow));
  }

  return mLow.includes(fLow) || fLow.includes(mLow);
}
