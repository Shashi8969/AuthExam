class Employee {
  constructor({
    name = '',
    phoneNo = '', // Stored as string in the model instance for form inputs
    addharNo = '', // Stored as string in the model instance for form inputs
    address = '',
    referenceName = '',
    imageUrl = '',
    addharFrontImageUrl = '',
    addharBackImageUrl = '',
    empId = '',
    isBiometricOperator = true,
  }) {
    this.name = name;
    this.phoneNo = phoneNo;
    this.addharNo = addharNo;
    this.address = address;
    this.referenceName = referenceName;
    this.imageUrl = imageUrl;
    this.addharFrontImageUrl = addharFrontImageUrl;
    this.addharBackImageUrl = addharBackImageUrl;
    this.empId = empId;
    this.isBiometricOperator = isBiometricOperator;
  }

  static fromFirebase(data) {
    if (!data) return null;
    return new Employee({
      ...data,
      // Convert numeric phoneNo and addharNo from Firebase back to strings
      phoneNo: data.phoneNo !== null && data.phoneNo !== undefined ? String(data.phoneNo) : '',
      addharNo: data.addharNo !== null && data.addharNo !== undefined ? String(data.addharNo) : '',
    });
  }

  toFirebase() {
    const data = {
      name: this.name ?? '',
      // Convert to number before saving to Firebase
      // Assumes phoneNo and addharNo are validated as numeric strings by the form
      // or are empty strings if not required/filled.
      phoneNo: this.phoneNo && this.phoneNo.trim() !== '' ? Number(this.phoneNo) : null,
      addharNo: this.addharNo && this.addharNo.trim() !== '' ? Number(this.addharNo) : null,
      address: this.address ?? '',
      referenceName: this.referenceName ?? '',
      imageUrl: this.imageUrl ?? '',
      addharFrontImageUrl: this.addharFrontImageUrl ?? '',
      addharBackImageUrl: this.addharBackImageUrl ?? '',
      empId: this.empId ?? '', // empId is often the key, but if stored in object, this is fine.
      isBiometricOperator: this.isBiometricOperator ?? true,
    };
    // Firebase handles null values appropriately by storing them as null.
    return data;
  }
}

export default Employee;
