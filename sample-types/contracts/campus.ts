export type Department = 'Sales' | 'HR' | 'Management';

export interface IEmployee {
    name: string;
    department: Department;
}

export interface IOffice {
    name: string;
    employees: IEmployee[];
}

export interface ICampus {
    name: string;
    offices: IOffice[];
    employees: IEmployee[];
}
