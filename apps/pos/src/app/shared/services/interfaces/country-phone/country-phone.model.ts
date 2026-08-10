import libphonenumber from 'google-libphonenumber';

const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
const PhoneNumberFormat = libphonenumber.PhoneNumberFormat;
const PhoneNumberType = libphonenumber.PhoneNumberType;

export class CountryPhone {
  iso: string;
  name: string;
  code: string;
  sample_phone: string;

  constructor (iso: string, name: string) {
    this.iso = iso;
    this.name = name;

    try {
      // Get region code from ISO (e.g., 'US' from ISO code)
      const regionCode = iso.toUpperCase();
      const exampleNumber = phoneUtil.getExampleNumberForType(regionCode, PhoneNumberType.MOBILE);

      if (exampleNumber) {
        this.sample_phone = phoneUtil.format(exampleNumber, PhoneNumberFormat.NATIONAL);
        this.code = '+' + exampleNumber.getCountryCode();
      } else {
        this.sample_phone = '';
        this.code = '';
      }
    } catch (error) {
      this.sample_phone = '';
      this.code = '';
    }
  }
}