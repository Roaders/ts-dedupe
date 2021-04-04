export type Department = 'Sales' | 'HR' | 'Management';

/**
 * Sample Comment
 */
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
