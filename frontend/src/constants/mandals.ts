export interface MandalItem {
  id: string;
  name: string;
  nameTe: string;
  nameHi: string;
  aliases: string[];
}

export const ASR_DISTRICT_MANDALS: MandalItem[] = [
  {
    id: 'Ananthagiri',
    name: 'Ananthagiri',
    nameTe: 'అనంతగిరి',
    nameHi: 'अनंतगिरि',
    aliases: ['Ananthagiri', 'Anantagiri']
  },
  {
    id: 'Araku Valley',
    name: 'Araku Valley',
    nameTe: 'అరకు లోయ',
    nameHi: 'अराकू वैली',
    aliases: ['Araku Valley', 'Araku', 'Arakuvalley']
  },
  {
    id: 'Chinthapalli',
    name: 'Chinthapalli',
    nameTe: 'చింతపల్లి',
    nameHi: 'चिंतापल्ली',
    aliases: ['Chinthapalli', 'Chintapalli', 'Chintapalle']
  },
  {
    id: 'Dumbriguda',
    name: 'Dumbriguda',
    nameTe: 'డుంబ్రిగుడ',
    nameHi: 'डुम्ब्रिगुडा',
    aliases: ['Dumbriguda']
  },
  {
    id: 'G. Madugula (Gangaraju Madugula)',
    name: 'G. Madugula (Gangaraju Madugula)',
    nameTe: 'జి. మాడుగుల (గంగరాజు మాడుగుల)',
    nameHi: 'जी. माडुगुला (गंगाराजू माडुगुला)',
    aliases: [
      'G. Madugula (Gangaraju Madugula)',
      'G. Madugula (Ganagaraju Madugula)',
      'G. Madugula',
      'Gangaraju Madugula',
      'Ganagaraju Madugula',
      'G.Madugula',
      'G Madugula'
    ]
  },
  {
    id: 'G.K Veedhi (Gudem Kotha Veedhi)',
    name: 'G.K Veedhi (Gudem Kotha Veedhi)',
    nameTe: 'జి.కె. వీధి (గూడెం కొత్త వీధి)',
    nameHi: 'जी.के. वीधि (गुडेम कोत्ता वीधि)',
    aliases: [
      'G.K Veedhi (Gudem Kotha Veedhi)',
      'G.K Veedhi',
      'GK Veedhi',
      'G.K. Veedhi',
      'Gudem Kotha Veedhi (G.K. Veedhi)',
      'Gudem Kotha Veedhi',
      'Gudem Kothaveedhi'
    ]
  },
  {
    id: 'Hukumpeta',
    name: 'Hukumpeta',
    nameTe: 'హుకుంపేట',
    nameHi: 'हुकुंपेटा',
    aliases: ['Hukumpeta', 'Hukumpet']
  },
  {
    id: 'Koyyuru',
    name: 'Koyyuru',
    nameTe: 'కొయ్యూరు',
    nameHi: 'कोय्यूरु',
    aliases: ['Koyyuru', 'Koyyur']
  },
  {
    id: 'Munchangiputtu',
    name: 'Munchangiputtu',
    nameTe: 'ముంచంగిపుట్టు',
    nameHi: 'मुंचंगिपुट्टू',
    aliases: ['Munchangiputtu', 'Munchingi Puttu', 'Munchingiputtu', 'Munchingput']
  },
  {
    id: 'Paderu (Headquarters)',
    name: 'Paderu (Headquarters)',
    nameTe: 'పాడేరు (ప్రధాన కార్యాలయం)',
    nameHi: 'पाडेरू (मुख्यालय)',
    aliases: ['Paderu (Headquarters)', 'Paderu', 'Paderu (Head quarters)', 'Paderu (head quaters)']
  },
  {
    id: 'Pedhabayalu',
    name: 'Pedhabayalu',
    nameTe: 'పెదబయలు',
    nameHi: 'पेदबयालु',
    aliases: ['Pedhabayalu', 'Peda Bayalu', 'Pedabayalu']
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
