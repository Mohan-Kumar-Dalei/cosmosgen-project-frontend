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

    // Recording what a vendor has handed back is the office's daily work,
    // and it is the same people who check the reference at the gateway.
    // Paying a vendor out is still the owner's.
    SETTLE_WALLET: ["backoffice", "superadmin"],

    // Owner only - anything that moves money outwards or changes access
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