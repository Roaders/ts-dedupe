export type Department = 'Sales' | 'HR' | 'Management';

export interface IEmployee {
    name: string; // sample comment
    department: Department;
    id: number;
}

export interface IOffice {
    name: string;
    employees: IEmployee[];
}
