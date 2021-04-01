export type Department = 'Sales' | 'HR' | 'Management';

export interface IEmployee {
    name: string;
    department: Department;
}

export interface IOffice {
    name: string;
    employees: IEmployee[];
}

export interface ICharity {
    offices: IOffice[];
    employees: IEmployee[];
}
