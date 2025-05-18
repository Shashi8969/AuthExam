class Employee {
  constructor({
    name = "",
    phoneNo = "",
    addharNo = "",
    address = "",
    referenceName = "",
    imageUrl = "",
    addharFrontImageUrl = "",
    addharBackImageUrl = "",
    empId = "",
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
    return new Employee({ ...data });
  }

  toFirebase() {
    return {
      name: this.name ?? "",
      phoneNo: this.phoneNo ?? "",
      addharNo: this.addharNo ?? "",
      address: this.address ?? "",
      referenceName: this.referenceName ?? "",
      imageUrl: this.imageUrl ?? "",
      addharFrontImageUrl: this.addharFrontImageUrl ?? "",
      addharBackImageUrl: this.addharBackImageUrl ?? "",
      empId: this.empId ?? "",
      isBiometricOperator: this.isBiometricOperator ?? true,
    };
  }
}

export default Employee;
