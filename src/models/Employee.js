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
    createdBy = '', // Add createdBy
    createdAt = null, // Add createdAt
    updatedAt = null, // Add updatedAt
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
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
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
      // Store as strings, or an empty string if null/undefined
      phoneNo: String(this.phoneNo || '').trim(),
      addharNo: String(this.addharNo || '').trim(),
      address: this.address ?? '',
      referenceName: this.referenceName ?? '',
      imageUrl: this.imageUrl ?? '',
      addharFrontImageUrl: this.addharFrontImageUrl ?? '',
      addharBackImageUrl: this.addharBackImageUrl ?? '',
      empId: this.empId ?? '', // empId is often the key, but if stored in object, this is fine.
      isBiometricOperator: this.isBiometricOperator ?? true,
      createdBy: this.createdBy ?? '',
      // Ensure serverTimestamp objects are passed as is, otherwise null
      createdAt: (this.createdAt && typeof this.createdAt === 'object' && '.sv' in this.createdAt) ? this.createdAt : null,
      updatedAt: (this.updatedAt && typeof this.updatedAt === 'object' && '.sv' in this.updatedAt) ? this.updatedAt : null,
    };
    // Convert other null/undefined to empty strings, but leave createdBy as is if it's already a UID string.
    // And ensure timestamps are not converted to empty strings if they are meant to be null or serverTimestamp.
    Object.keys(data).forEach(key => {
      if (key !== 'createdAt' && key !== 'updatedAt') { // Don't process timestamps here
        if (data[key] === null || data[key] === undefined) {
          data[key] = '';
        }
      }
    });
    return data;
  }
}
export default Employee;
