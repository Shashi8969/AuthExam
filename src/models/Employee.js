// src/models/Employee.js
class Employee {
    constructor({
      empId,
      name,
      phoneNo,
      addharNo,
      address,
      referenceName,
      imageUrl,
      addharFrontImageUrl,
      addharBackImageUrl,
      isBiometricOperator
    }) {
      this.empId = empId;
      this.name = name;
      this.phoneNo = phoneNo;
      this.addharNo = addharNo;
      this.address = address;
      this.referenceName = referenceName;
      this.imageUrl = imageUrl;
      this.addharFrontImageUrl = addharFrontImageUrl;
      this.addharBackImageUrl = addharBackImageUrl;
      this.isBiometricOperator = isBiometricOperator;
    }
  
    static fromFirebase(data) {
      return new Employee({
        empId: data.empId,
        name: data.name,
        phoneNo: data.phoneNo,
        addharNo: data.addharNo,
        address: data.address,
        referenceName: data.referenceName,
        imageUrl: data.imageUrl,
        addharFrontImageUrl: data.addharFrontImageUrl,
        addharBackImageUrl: data.addharBackImageUrl,
        isBiometricOperator: data.isBiometricOperator
      });
    }
  
    toFirebase() {
      return {
        empId: this.empId,
        name: this.name,
        phoneNo: this.phoneNo,
        addharNo: this.addharNo,
        address: this.address,
        referenceName: this.referenceName,
        imageUrl: this.imageUrl,
        addharFrontImageUrl: this.addharFrontImageUrl,
        addharBackImageUrl: this.addharBackImageUrl,
        isBiometricOperator: this.isBiometricOperator
      };
    }
  }
  
  export default Employee;