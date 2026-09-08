/**
 * Pakistan Geographic Hierarchy Dataset
 * Source: All Cities & Districts of Pakistan (Faisalabad Realtors & Official Administrative Records)
 * Hierarchy: Province -> District / City -> Tehsil / City / Town
 */

export interface PakistanTehsil {
  name: string;
  isMajorCity?: boolean;
}

export interface PakistanDistrict {
  name: string;
  isMajorCity?: boolean;
  tehsils: PakistanTehsil[];
}

export interface PakistanProvince {
  name: string;
  districts: PakistanDistrict[];
}

export interface FlatPakistanLocation {
  id?: number | undefined;
  province: string;
  district: string;
  tehsil: string;
  cityName: string;
  fullName: string;
  isMajorCity?: boolean | undefined;
}

export const PAKISTAN_LOCATION_DATA: PakistanProvince[] = [
  {
    name: 'Punjab',
    districts: [
      {
        name: 'Lahore',
        isMajorCity: true,
        tehsils: [
          { name: 'Lahore', isMajorCity: true },
          { name: 'Raiwind' },
          { name: 'Walton' },
          { name: 'Kahna' },
          { name: 'Thokar Niaz Baig' },
          { name: 'Shahdara' },
          { name: 'Model Town' },
          { name: 'Lahore Cantt' },
        ]
      },
      {
        name: 'Faisalabad',
        isMajorCity: true,
        tehsils: [
          { name: 'Faisalabad', isMajorCity: true },
          { name: 'Jaranwala' },
          { name: 'Samundri' },
          { name: 'Tandlianwala' },
          { name: 'Chak Jhumra' },
          { name: 'Dijkot' },
          { name: 'Khurrianwala' },
        ]
      },
      {
        name: 'Rawalpindi',
        isMajorCity: true,
        tehsils: [
          { name: 'Rawalpindi', isMajorCity: true },
          { name: 'Murree' },
          { name: 'Gujar Khan' },
          { name: 'Kahuta' },
          { name: 'Kallar Syedan' },
          { name: 'Kotli Sattian' },
          { name: 'Taxila' },
        ]
      },
      {
        name: 'Multan',
        isMajorCity: true,
        tehsils: [
          { name: 'Multan', isMajorCity: true },
          { name: 'Shujabad' },
          { name: 'Jalalpur Pirwala' },
          { name: 'Bosan' },
          { name: 'Qadirpur Raan' },
          { name: 'Makhdoom Rashid' },
        ]
      },
      {
        name: 'Gujranwala',
        isMajorCity: true,
        tehsils: [
          { name: 'Gujranwala', isMajorCity: true },
          { name: 'Kamoke' },
          { name: 'Nowshera Virkan' },
          { name: 'Eminabad' },
          { name: 'Qila Didar Singh' },
          { name: 'Wazirabad' },
        ]
      },
      {
        name: 'Sialkot',
        isMajorCity: true,
        tehsils: [
          { name: 'Sialkot', isMajorCity: true },
          { name: 'Daska' },
          { name: 'Sambrial' },
          { name: 'Pasrur' },
          { name: 'Uggoki' },
        ]
      },
      {
        name: 'Sargodha',
        isMajorCity: true,
        tehsils: [
          { name: 'Sargodha', isMajorCity: true },
          { name: 'Bhalwal' },
          { name: 'Shahpur' },
          { name: 'Sillanwali' },
          { name: 'Kot Momin' },
          { name: 'Sahiwal (Sargodha)' },
        ]
      },
      {
        name: 'Bahawalpur',
        isMajorCity: true,
        tehsils: [
          { name: 'Bahawalpur', isMajorCity: true },
          { name: 'Hasilpur' },
          { name: 'Yazman' },
          { name: 'Ahmadpur East' },
          { name: 'Khairpur Tamewali' },
        ]
      },
      {
        name: 'Rahim Yar Khan',
        isMajorCity: true,
        tehsils: [
          { name: 'Rahim Yar Khan', isMajorCity: true },
          { name: 'Sadiqabad' },
          { name: 'Liaqatpur' },
          { name: 'Khanpur' },
        ]
      },
      {
        name: 'Sheikhupura',
        isMajorCity: true,
        tehsils: [
          { name: 'Sheikhupura', isMajorCity: true },
          { name: 'Muridke' },
          { name: 'Sharaqpur' },
          { name: 'Ferozewala' },
          { name: 'Safdarabad' },
        ]
      },
      {
        name: 'Kasur',
        tehsils: [
          { name: 'Kasur', isMajorCity: true },
          { name: 'Pattoki' },
          { name: 'Chunian' },
          { name: 'Kot Radha Kishan' },
          { name: 'Khudian' },
        ]
      },
      {
        name: 'Okara',
        tehsils: [
          { name: 'Okara', isMajorCity: true },
          { name: 'Depalpur' },
          { name: 'Renala Khurd' },
          { name: 'Hujra Shah Muqeem' },
          { name: 'Haveli Lakha' },
        ]
      },
      {
        name: 'Sahiwal',
        isMajorCity: true,
        tehsils: [
          { name: 'Sahiwal', isMajorCity: true },
          { name: 'Chichawatni' },
          { name: 'Noor Shah' },
          { name: 'Harappa' },
        ]
      },
      {
        name: 'Gujrat',
        isMajorCity: true,
        tehsils: [
          { name: 'Gujrat', isMajorCity: true },
          { name: 'Kharian' },
          { name: 'Jalalpur Jattan' },
          { name: 'Lalamusa' },
          { name: 'Sarai Alamgir' },
        ]
      },
      {
        name: 'Jhelum',
        tehsils: [
          { name: 'Jhelum', isMajorCity: true },
          { name: 'Dina' },
          { name: 'Sohawa' },
          { name: 'Pind Dadan Khan' },
        ]
      },
      {
        name: 'Chiniot',
        tehsils: [
          { name: 'Chiniot', isMajorCity: true },
          { name: 'Lalian' },
          { name: 'Bhawana' },
          { name: 'Chenab Nagar (Rabwah)' },
        ]
      },
      {
        name: 'Mianwali',
        tehsils: [
          { name: 'Mianwali', isMajorCity: true },
          { name: 'Isa Khel' },
          { name: 'Daud Khel' },
          { name: 'Piplan' },
        ]
      },
      {
        name: 'Chakwal',
        tehsils: [
          { name: 'Chakwal', isMajorCity: true },
          { name: 'Talagang' },
          { name: 'Choa Saidan Shah' },
          { name: 'Kallar Kahar' },
          { name: 'Lawa' },
        ]
      },
      {
        name: 'Pakpattan',
        tehsils: [
          { name: 'Pakpattan', isMajorCity: true },
          { name: 'Arifwala' },
        ]
      },
      {
        name: 'Vehari',
        tehsils: [
          { name: 'Vehari', isMajorCity: true },
          { name: 'Mailsi' },
          { name: 'Burewala' },
          { name: 'Gaggo Mandi' },
        ]
      },
      {
        name: 'Lodhran',
        tehsils: [
          { name: 'Lodhran', isMajorCity: true },
          { name: 'Dunyapur' },
          { name: 'Kehror Pacca' },
        ]
      },
      {
        name: 'Bhakkar',
        tehsils: [
          { name: 'Bhakkar', isMajorCity: true },
          { name: 'Darya Khan' },
          { name: 'Kallur Kot' },
          { name: 'Mankera' },
        ]
      },
      {
        name: 'Layyah',
        tehsils: [
          { name: 'Layyah', isMajorCity: true },
          { name: 'Karor Lal Esan' },
          { name: 'Chaubara' },
          { name: 'Fatehpur' },
        ]
      },
      {
        name: 'Khanewal',
        tehsils: [
          { name: 'Khanewal', isMajorCity: true },
          { name: 'Kabirwala' },
          { name: 'Mian Channu' },
          { name: 'Jahanian' },
          { name: 'Abdul Hakeem' },
        ]
      },
      {
        name: 'Muzaffargarh',
        tehsils: [
          { name: 'Muzaffargarh', isMajorCity: true },
          { name: 'Alipur' },
          { name: 'Jatoi' },
          { name: 'Kot Addu' },
          { name: 'Rohillanwali' },
        ]
      },
      {
        name: 'Dera Ghazi Khan',
        isMajorCity: true,
        tehsils: [
          { name: 'Dera Ghazi Khan', isMajorCity: true },
          { name: 'Taunsa Sharif' },
          { name: 'Kot Chutta' },
        ]
      },
      {
        name: 'Bahawalnagar',
        tehsils: [
          { name: 'Bahawalnagar', isMajorCity: true },
          { name: 'Fort Abbas' },
          { name: 'Haroonabad' },
          { name: 'Chishtian' },
          { name: 'Minchinabad' },
        ]
      },
      {
        name: 'Nankana Sahib',
        tehsils: [
          { name: 'Nankana Sahib', isMajorCity: true },
          { name: 'Shahkot' },
          { name: 'Sangla Hill' },
          { name: 'Warburton' },
        ]
      },
      {
        name: 'Hafizabad',
        tehsils: [
          { name: 'Hafizabad', isMajorCity: true },
          { name: 'Pindi Bhattian' },
          { name: 'Sukheke' },
        ]
      },
      {
        name: 'Narowal',
        tehsils: [
          { name: 'Narowal', isMajorCity: true },
          { name: 'Shakargarh' },
          { name: 'Zafarwal' },
        ]
      },
      {
        name: 'Attock',
        tehsils: [
          { name: 'Attock', isMajorCity: true },
          { name: 'Hasan Abdal' },
          { name: 'Fateh Jang' },
          { name: 'Jand' },
          { name: 'Pindi Gheb' },
          { name: 'Hazro' },
        ]
      },
      {
        name: 'Toba Tek Singh',
        tehsils: [
          { name: 'Toba Tek Singh', isMajorCity: true },
          { name: 'Gojra' },
          { name: 'Kamalia' },
          { name: 'Pir Mahal' },
        ]
      },
      {
        name: 'Jhang',
        tehsils: [
          { name: 'Jhang', isMajorCity: true },
          { name: 'Shorkot' },
          { name: 'Ahmedpur Sial' },
          { name: 'Athara Hazari' },
        ]
      },
      {
        name: 'Khushab',
        tehsils: [
          { name: 'Khushab', isMajorCity: true },
          { name: 'Jauharabad' },
          { name: 'Noshera' },
          { name: 'Hadali' },
          { name: 'Quaidabad' },
        ]
      },
      {
        name: 'Mandi Bahauddin',
        tehsils: [
          { name: 'Mandi Bahauddin', isMajorCity: true },
          { name: 'Phalia' },
          { name: 'Malakwal' },
        ]
      },
      {
        name: 'Rajanpur',
        tehsils: [
          { name: 'Rajanpur', isMajorCity: true },
          { name: 'Jampur' },
          { name: 'Fazilpur' },
          { name: 'Rojhan' },
        ]
      },
    ]
  },
  {
    name: 'Sindh',
    districts: [
      {
        name: 'Karachi Central',
        isMajorCity: true,
        tehsils: [
          { name: 'Karachi Central', isMajorCity: true },
          { name: 'Liaquatabad' },
          { name: 'Nazimabad' },
          { name: 'North Nazimabad' },
          { name: 'Gulberg (Karachi)' },
          { name: 'Federal B Area' },
          { name: 'Karimabad' },
        ]
      },
      {
        name: 'Karachi East',
        isMajorCity: true,
        tehsils: [
          { name: 'Karachi East', isMajorCity: true },
          { name: 'Gulshan-e-Iqbal' },
          { name: 'Gulistan-e-Jauhar' },
          { name: 'Bahadurabad' },
          { name: 'Safoora' },
          { name: 'Cantt (Karachi)' },
          { name: 'PECHS' },
        ]
      },
      {
        name: 'Karachi South',
        isMajorCity: true,
        tehsils: [
          { name: 'Karachi South', isMajorCity: true },
          { name: 'Saddar' },
          { name: 'Clifton' },
          { name: 'Defence (DHA Karachi)' },
          { name: 'Burns Road' },
          { name: 'Lyari' },
          { name: 'Kharadar' },
        ]
      },
      {
        name: 'Karachi West',
        isMajorCity: true,
        tehsils: [
          { name: 'Karachi West', isMajorCity: true },
          { name: 'Orangi Town' },
          { name: 'Baldia Town' },
          { name: 'SITE' },
          { name: 'Manghopir' },
          { name: 'Surjani Town' },
        ]
      },
      {
        name: 'Korangi',
        isMajorCity: true,
        tehsils: [
          { name: 'Korangi', isMajorCity: true },
          { name: 'Landhi' },
          { name: 'Shah Faisal Colony' },
          { name: 'Model Colony' },
          { name: 'Korangi Creek' },
        ]
      },
      {
        name: 'Malir',
        isMajorCity: true,
        tehsils: [
          { name: 'Malir', isMajorCity: true },
          { name: 'Shah Latif Town' },
          { name: 'Quaidabad' },
          { name: 'Bin Qasim' },
          { name: 'Ibrahim Hyderi' },
        ]
      },
      {
        name: 'Hyderabad',
        isMajorCity: true,
        tehsils: [
          { name: 'Hyderabad', isMajorCity: true },
          { name: 'Qasimabad' },
          { name: 'Latifabad' },
          { name: 'Tando Jam' },
        ]
      },
      {
        name: 'Sukkur',
        isMajorCity: true,
        tehsils: [
          { name: 'Sukkur', isMajorCity: true },
          { name: 'Rohri' },
          { name: 'Pano Aqil' },
          { name: 'Saleh Pat' },
        ]
      },
      {
        name: 'Larkana',
        isMajorCity: true,
        tehsils: [
          { name: 'Larkana', isMajorCity: true },
          { name: 'Ratodero' },
          { name: 'Dokri' },
          { name: 'Bakrani' },
        ]
      },
      {
        name: 'Mirpurkhas',
        isMajorCity: true,
        tehsils: [
          { name: 'Mirpurkhas', isMajorCity: true },
          { name: 'Jhuddo' },
          { name: 'Sindhri' },
          { name: 'Digri' },
          { name: 'Kot Ghulam Muhammad' },
        ]
      },
      {
        name: 'Nawabshah (Shaheed Benazirabad)',
        isMajorCity: true,
        tehsils: [
          { name: 'Nawabshah', isMajorCity: true },
          { name: 'Sakrand' },
          { name: 'Daur' },
          { name: 'Qazi Ahmed' },
        ]
      },
      {
        name: 'Badin',
        tehsils: [
          { name: 'Badin', isMajorCity: true },
          { name: 'Tando Bago' },
          { name: 'Matli' },
          { name: 'Talhar' },
          { name: 'Khoski' },
          { name: 'Golarchi' },
        ]
      },
      {
        name: 'Thatta',
        tehsils: [
          { name: 'Thatta', isMajorCity: true },
          { name: 'Mirpur Sakro' },
          { name: 'Keti Bander' },
          { name: 'Gharo' },
          { name: 'Makli' },
        ]
      },
      {
        name: 'Sujawal',
        tehsils: [
          { name: 'Sujawal', isMajorCity: true },
          { name: 'Jati' },
          { name: 'Shah Bunder' },
          { name: 'Chuhar Jamali' },
          { name: 'Mirpur Bathoro' },
        ]
      },
      {
        name: 'Khairpur',
        tehsils: [
          { name: 'Khairpur', isMajorCity: true },
          { name: 'Kot Diji' },
          { name: 'Mirwah' },
          { name: 'Gambat' },
          { name: 'Sobhodero' },
          { name: 'Hingorja' },
          { name: 'Faiz Ganj' },
        ]
      },
      {
        name: 'Jacobabad',
        tehsils: [
          { name: 'Jacobabad', isMajorCity: true },
          { name: 'Thul' },
          { name: 'Garhi Khairo' },
        ]
      },
      {
        name: 'Shikarpur',
        tehsils: [
          { name: 'Shikarpur', isMajorCity: true },
          { name: 'Khanpur' },
          { name: 'Lakhi' },
          { name: 'Garhi Yasin' },
        ]
      },
      {
        name: 'Tando Allahyar',
        tehsils: [
          { name: 'Tando Allahyar', isMajorCity: true },
          { name: 'Chamber' },
          { name: 'Jhando Mari' },
          { name: 'Nasarpur' },
        ]
      },
      {
        name: 'Tando Muhammad Khan',
        tehsils: [
          { name: 'Tando Muhammad Khan', isMajorCity: true },
          { name: 'Bulri Shah Karim' },
          { name: 'Tando Ghulam Hyder' },
        ]
      },
      {
        name: 'Umerkot',
        tehsils: [
          { name: 'Umerkot', isMajorCity: true },
          { name: 'Samaro' },
          { name: 'Kunri' },
          { name: 'Pithoro' },
        ]
      },
      {
        name: 'Dadu',
        tehsils: [
          { name: 'Dadu', isMajorCity: true },
          { name: 'Johi' },
          { name: 'Khairpur Nathan Shah' },
          { name: 'Mehar' },
          { name: 'Sehwan Sharif' },
        ]
      },
      {
        name: 'Matiari',
        tehsils: [
          { name: 'Matiari', isMajorCity: true },
          { name: 'Hala' },
          { name: 'Saeedabad' },
        ]
      },
      {
        name: 'Sanghar',
        tehsils: [
          { name: 'Sanghar', isMajorCity: true },
          { name: 'Shahdadpur' },
          { name: 'Tando Adam' },
          { name: 'Khipro' },
          { name: 'Sinjhoro' },
          { name: 'Jam Nawaz Ali' },
        ]
      },
      {
        name: 'Ghotki',
        tehsils: [
          { name: 'Ghotki', isMajorCity: true },
          { name: 'Mirpur Mathelo' },
          { name: 'Ubauro' },
          { name: 'Khanpur Mahar' },
          { name: 'Daharki' },
        ]
      },
      {
        name: 'Kashmore',
        tehsils: [
          { name: 'Kashmore', isMajorCity: true },
          { name: 'Kandhkot' },
          { name: 'Tangwani' },
        ]
      },
      {
        name: 'Naushahro Feroze',
        tehsils: [
          { name: 'Naushahro Feroze', isMajorCity: true },
          { name: 'Moro' },
          { name: 'Mehrabpur' },
          { name: 'Bhiria City' },
          { name: 'Kandiaro' },
          { name: 'Padidan' },
        ]
      },
      {
        name: 'Jamshoro',
        tehsils: [
          { name: 'Kotri', isMajorCity: true },
          { name: 'Sehwan' },
          { name: 'Manjhand' },
          { name: 'Thana Bula Khan' },
          { name: 'Nooriabad' },
        ]
      },
      {
        name: 'Tharparkar',
        tehsils: [
          { name: 'Mithi', isMajorCity: true },
          { name: 'Islamkot' },
          { name: 'Chachro' },
          { name: 'Diplo' },
          { name: 'Kaloi' },
          { name: 'Nagarparkar' },
        ]
      },
      {
        name: 'Kambar Shahdadkot',
        tehsils: [
          { name: 'Shahdadkot', isMajorCity: true },
          { name: 'Kambar' },
          { name: 'Qubo Saeed Khan' },
          { name: 'Warah' },
          { name: 'Miro Khan' },
          { name: 'Nasirabad (Sindh)' },
        ]
      },
    ]
  },
  {
    name: 'Khyber Pakhtunkhwa',
    districts: [
      {
        name: 'Peshawar',
        isMajorCity: true,
        tehsils: [
          { name: 'Peshawar', isMajorCity: true },
          { name: 'Hayatabad' },
          { name: 'Tehkal' },
          { name: 'Chamkani' },
          { name: 'Badaber' },
          { name: 'University Town' },
        ]
      },
      {
        name: 'Mardan',
        isMajorCity: true,
        tehsils: [
          { name: 'Mardan', isMajorCity: true },
          { name: 'Takht Bhai' },
          { name: 'Katlang' },
          { name: 'Rustam' },
          { name: 'Lund Khwar' },
        ]
      },
      {
        name: 'Swat',
        isMajorCity: true,
        tehsils: [
          { name: 'Mingora', isMajorCity: true },
          { name: 'Saidu Sharif' },
          { name: 'Matta' },
          { name: 'Kabal' },
          { name: 'Bahrain' },
          { name: 'Kalam' },
          { name: 'Charbagh' },
        ]
      },
      {
        name: 'Abbottabad',
        isMajorCity: true,
        tehsils: [
          { name: 'Abbottabad', isMajorCity: true },
          { name: 'Havelian' },
          { name: 'Lora' },
          { name: 'Nawan Shehr' },
        ]
      },
      {
        name: 'Mansehra',
        tehsils: [
          { name: 'Mansehra', isMajorCity: true },
          { name: 'Balakot' },
          { name: 'Oghi' },
          { name: 'Baffa' },
          { name: 'Shinkiari' },
          { name: 'Kaghan' },
          { name: 'Naran' },
        ]
      },
      {
        name: 'Haripur',
        tehsils: [
          { name: 'Haripur', isMajorCity: true },
          { name: 'Khanpur (KPK)' },
          { name: 'Ghazi' },
          { name: 'Hattar' },
          { name: 'Kot Najibullah' },
        ]
      },
      {
        name: 'Charsadda',
        tehsils: [
          { name: 'Charsadda', isMajorCity: true },
          { name: 'Shabqadar' },
          { name: 'Tangi' },
          { name: 'Utmanzai' },
        ]
      },
      {
        name: 'Nowshera',
        tehsils: [
          { name: 'Nowshera', isMajorCity: true },
          { name: 'Akora Khattak' },
          { name: 'Pabbi' },
          { name: 'Jehangira' },
          { name: 'Risalpur' },
        ]
      },
      {
        name: 'Swabi',
        tehsils: [
          { name: 'Swabi', isMajorCity: true },
          { name: 'Topi' },
          { name: 'Razar' },
          { name: 'Chota Lahore' },
        ]
      },
      {
        name: 'Kohat',
        tehsils: [
          { name: 'Kohat', isMajorCity: true },
          { name: 'Lachi' },
          { name: 'Gumbat' },
        ]
      },
      {
        name: 'Bannu',
        tehsils: [
          { name: 'Bannu', isMajorCity: true },
          { name: 'Domel' },
          { name: 'Kakki' },
          { name: 'Miryan' },
        ]
      },
      {
        name: 'Dera Ismail Khan',
        tehsils: [
          { name: 'Dera Ismail Khan', isMajorCity: true },
          { name: 'Kulachi' },
          { name: 'Paharpur' },
          { name: 'Paroa' },
          { name: 'Daraban' },
        ]
      },
      {
        name: 'Lakki Marwat',
        tehsils: [
          { name: 'Lakki Marwat', isMajorCity: true },
          { name: 'Serai Naurang' },
          { name: 'Pezu' },
        ]
      },
      {
        name: 'Tank',
        tehsils: [
          { name: 'Tank', isMajorCity: true },
          { name: 'Jandola' },
        ]
      },
      {
        name: 'Karak',
        tehsils: [
          { name: 'Karak', isMajorCity: true },
          { name: 'Banda Daudshah' },
          { name: 'Takht-e-Nasrati' },
        ]
      },
      {
        name: 'Batagram',
        tehsils: [
          { name: 'Batagram', isMajorCity: true },
          { name: 'Allai' },
        ]
      },
      {
        name: 'Shangla',
        tehsils: [
          { name: 'Alpuri', isMajorCity: true },
          { name: 'Puran' },
          { name: 'Besham' },
        ]
      },
      {
        name: 'Upper Dir',
        tehsils: [
          { name: 'Dir', isMajorCity: true },
          { name: 'Wari' },
        ]
      },
      {
        name: 'Lower Dir',
        tehsils: [
          { name: 'Timergara', isMajorCity: true },
          { name: 'Chakdara' },
          { name: 'Maidan' },
        ]
      },
      {
        name: 'Malakand',
        tehsils: [
          { name: 'Batkhela', isMajorCity: true },
          { name: 'Dargai' },
          { name: 'Thana' },
        ]
      },
      {
        name: 'Buner',
        tehsils: [
          { name: 'Daggar', isMajorCity: true },
          { name: 'Sawari' },
          { name: 'Totalai' },
        ]
      },
      {
        name: 'Hangu',
        tehsils: [
          { name: 'Hangu', isMajorCity: true },
          { name: 'Thall' },
        ]
      },
      {
        name: 'Kurram',
        tehsils: [
          { name: 'Parachinar', isMajorCity: true },
          { name: 'Sadda' },
          { name: 'Alizai' },
        ]
      },
      {
        name: 'North Waziristan',
        tehsils: [
          { name: 'Miranshah', isMajorCity: true },
          { name: 'Mir Ali' },
          { name: 'Razmak' },
        ]
      },
      {
        name: 'South Waziristan',
        tehsils: [
          { name: 'Wana', isMajorCity: true },
          { name: 'Ladha' },
          { name: 'Shakai' },
        ]
      },
    ]
  },
  {
    name: 'Balochistan',
    districts: [
      {
        name: 'Quetta',
        isMajorCity: true,
        tehsils: [
          { name: 'Quetta', isMajorCity: true },
          { name: 'Kuchlak' },
          { name: 'Panjpai' },
          { name: 'Chiltan' },
        ]
      },
      {
        name: 'Gwadar',
        isMajorCity: true,
        tehsils: [
          { name: 'Gwadar', isMajorCity: true },
          { name: 'Pasni' },
          { name: 'Ormara' },
          { name: 'Jiwani' },
        ]
      },
      {
        name: 'Kech (Turbat)',
        isMajorCity: true,
        tehsils: [
          { name: 'Turbat', isMajorCity: true },
          { name: 'Buleda' },
          { name: 'Tump' },
          { name: 'Mand' },
          { name: 'Dasht' },
        ]
      },
      {
        name: 'Khuzdar',
        tehsils: [
          { name: 'Khuzdar', isMajorCity: true },
          { name: 'Wadh' },
          { name: 'Nal' },
          { name: 'Zehri' },
          { name: 'Moola' },
        ]
      },
      {
        name: 'Chaman',
        tehsils: [
          { name: 'Chaman', isMajorCity: true },
        ]
      },
      {
        name: 'Hub',
        tehsils: [
          { name: 'Hub', isMajorCity: true },
          { name: 'Gadani' },
          { name: 'Dureji' },
          { name: 'Sonmiani' },
        ]
      },
      {
        name: 'Lasbela',
        tehsils: [
          { name: 'Uthal', isMajorCity: true },
          { name: 'Bela' },
          { name: 'Kanraj' },
          { name: 'Lakhra' },
        ]
      },
      {
        name: 'Sibi',
        tehsils: [
          { name: 'Sibi', isMajorCity: true },
          { name: 'Harnai' },
        ]
      },
      {
        name: 'Zhob',
        tehsils: [
          { name: 'Zhob', isMajorCity: true },
          { name: 'Qamba' },
        ]
      },
      {
        name: 'Loralai',
        tehsils: [
          { name: 'Loralai', isMajorCity: true },
          { name: 'Bori' },
          { name: 'Mekhtar' },
        ]
      },
      {
        name: 'Kalat',
        tehsils: [
          { name: 'Kalat', isMajorCity: true },
          { name: 'Mangochar' },
          { name: 'Surab' },
        ]
      },
      {
        name: 'Jaffarabad',
        tehsils: [
          { name: 'Dera Allah Yar', isMajorCity: true },
          { name: 'Usta Mohammad' },
        ]
      },
      {
        name: 'Nasirabad',
        tehsils: [
          { name: 'Dera Murad Jamali', isMajorCity: true },
          { name: 'Chattar' },
          { name: 'Tamboo' },
        ]
      },
      {
        name: 'Pishin',
        tehsils: [
          { name: 'Pishin', isMajorCity: true },
          { name: 'Barshore' },
          { name: 'Karezat' },
          { name: 'Hurramzai' },
        ]
      },
      {
        name: 'Mastung',
        tehsils: [
          { name: 'Mastung', isMajorCity: true },
          { name: 'Dasht (Mastung)' },
          { name: 'Kardigap' },
        ]
      },
      {
        name: 'Ziarat',
        tehsils: [
          { name: 'Ziarat', isMajorCity: true },
          { name: 'Sinjawi' },
        ]
      },
      {
        name: 'Panjgur',
        tehsils: [
          { name: 'Panjgur', isMajorCity: true },
          { name: 'Gowargo' },
          { name: 'Gichk' },
        ]
      },
    ]
  },
  {
    name: 'Islamabad Capital Territory',
    districts: [
      {
        name: 'Islamabad',
        isMajorCity: true,
        tehsils: [
          { name: 'Islamabad', isMajorCity: true },
          { name: 'Bhara Kahu' },
          { name: 'Tarnol' },
          { name: 'Rawat' },
          { name: 'Sihala' },
          { name: 'Tarlai Kalan' },
          { name: 'Bani Gala' },
          { name: 'Chak Shahzad' },
          { name: 'Nilore' },
          { name: 'Golra' },
        ]
      }
    ]
  },
  {
    name: 'Azad Jammu & Kashmir',
    districts: [
      {
        name: 'Muzaffarabad',
        isMajorCity: true,
        tehsils: [
          { name: 'Muzaffarabad', isMajorCity: true },
          { name: 'Pattikka' },
          { name: 'Garhi Dupatta' },
        ]
      },
      {
        name: 'Mirpur',
        isMajorCity: true,
        tehsils: [
          { name: 'Mirpur', isMajorCity: true },
          { name: 'Dadyal' },
          { name: 'Islamgarh' },
        ]
      },
      {
        name: 'Kotli',
        tehsils: [
          { name: 'Kotli', isMajorCity: true },
          { name: 'Sehnsa' },
          { name: 'Fatehpur Thakiala' },
          { name: 'Charhoi' },
          { name: 'Khuiratta' },
        ]
      },
      {
        name: 'Rawalakot (Poonch)',
        tehsils: [
          { name: 'Rawalakot', isMajorCity: true },
          { name: 'Hajira' },
          { name: 'Abbaspur' },
          { name: 'Thorar' },
        ]
      },
      {
        name: 'Bhimber',
        tehsils: [
          { name: 'Bhimber', isMajorCity: true },
          { name: 'Barnala' },
          { name: 'Samahni' },
        ]
      },
      {
        name: 'Bagh',
        tehsils: [
          { name: 'Bagh', isMajorCity: true },
          { name: 'Dhirkot' },
          { name: 'Hari Ghel' },
        ]
      },
    ]
  },
  {
    name: 'Gilgit-Baltistan',
    districts: [
      {
        name: 'Gilgit',
        isMajorCity: true,
        tehsils: [
          { name: 'Gilgit', isMajorCity: true },
          { name: 'Danyor' },
          { name: 'Juglot' },
        ]
      },
      {
        name: 'Skardu',
        isMajorCity: true,
        tehsils: [
          { name: 'Skardu', isMajorCity: true },
          { name: 'Rondu' },
          { name: 'Gamba' },
        ]
      },
      {
        name: 'Hunza',
        tehsils: [
          { name: 'Aliabad', isMajorCity: true },
          { name: 'Karimabad' },
          { name: 'Gulmit' },
          { name: 'Passu' },
        ]
      },
      {
        name: 'Diamer',
        tehsils: [
          { name: 'Chilas', isMajorCity: true },
          { name: 'Darel' },
          { name: 'Tangir' },
        ]
      },
      {
        name: 'Ghizer',
        tehsils: [
          { name: 'Gahkuch', isMajorCity: true },
          { name: 'Gupis' },
          { name: 'Yasin' },
        ]
      },
    ]
  }
];

/**
 * Pre-flattened searchable list of all locations
 */
export const FLAT_PAKISTAN_LOCATIONS: FlatPakistanLocation[] = (() => {
  const list: FlatPakistanLocation[] = [];
  PAKISTAN_LOCATION_DATA.forEach(prov => {
    prov.districts.forEach(dist => {
      dist.tehsils.forEach(tehsil => {
        list.push({
          province: prov.name,
          district: dist.name,
          tehsil: tehsil.name,
          cityName: tehsil.name,
          fullName: `${tehsil.name}, ${dist.name}, ${prov.name}`,
          isMajorCity: Boolean(tehsil.isMajorCity || dist.isMajorCity)
        });
      });
    });
  });
  return list;
})();

/**
 * Fast lookup helper to resolve any search string or city name to its full hierarchy
 */
export function findPakistanLocation(query: string | number): FlatPakistanLocation | null {
  if (!query) return null;
  const str = String(query).trim().toLowerCase();

  // 1. Exact tehsil match
  const exactTehsil = FLAT_PAKISTAN_LOCATIONS.find(loc => loc.tehsil.toLowerCase() === str);
  if (exactTehsil) return exactTehsil;

  // 2. Exact district match
  const exactDist = FLAT_PAKISTAN_LOCATIONS.find(loc => loc.district.toLowerCase() === str);
  if (exactDist) return exactDist;

  // 3. Substring match
  const subMatch = FLAT_PAKISTAN_LOCATIONS.find(loc => 
    loc.tehsil.toLowerCase().includes(str) || 
    loc.district.toLowerCase().includes(str) ||
    str.includes(loc.tehsil.toLowerCase())
  );
  return subMatch || null;
}
