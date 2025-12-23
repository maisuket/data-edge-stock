export declare class User {
}
export declare class UserEntity {
    id: string;
    username: string;
    email: string;
    name: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    constructor(partial: Partial<UserEntity>);
}
