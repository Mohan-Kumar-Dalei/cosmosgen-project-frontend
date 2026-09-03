export const PERMISSIONS = {
    // Both roles
    VIEW_TICKETS: ["backoffice", "superadmin"],
    ASSIGN_TICKET: ["backoffice", "superadmin"],
    CANCEL_TICKET: ["backoffice", "superadmin"],
    VIEW_TECHNICIANS: ["backoffice", "superadmin"],
    APPROVE_TECHNICIAN: ["backoffice", "superadmin"],
    VIEW_PAYMENTS: ["backoffice", "superadmin"],
    VERIFY_PAYMENT: ["backoffice", "superadmin"],
    MANAGE_PRICING: ["backoffice", "superadmin"],
    // Seeing balances helps the backoffice answer technician questions
    VIEW_WALLETS: ["backoffice", "superadmin"],

    // Owner only - anything that moves money or changes who has access
    SETTLE_WALLET: ["superadmin"],
    BLOCK_TECHNICIAN: ["superadmin"],
    FORCE_CLOSE: ["superadmin"],
    MANAGE_STAFF: ["superadmin"],
    VIEW_ANALYTICS: ["superadmin"],
};

export const can = (role, permission) => {
    const allowed = PERMISSIONS[permission];
    if (!allowed) return false;
    return allowed.includes(role);
};