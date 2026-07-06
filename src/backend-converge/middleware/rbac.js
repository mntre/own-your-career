/**
 * Own Your Career — RBAC Middleware (Converge Cloud)
 * 
 * Enforces role-based access control.
 * Roles: MANAGER, DATA_SPOC, EMPLOYEE, ADMIN
 * 
 * Rules:
 * - Managers can only access their own team's data
 * - Data SPOCs can only access their group's OKR data
 * - Employees can only access their own data
 * - Admins have access to all system functions
 * 
 * @fileoverview Role-Based Access Control middleware
 */

'use strict';

/**
 * Check if user has admin role
 * @param {Object} user - Decoded JWT user object
 * @returns {boolean} True if user is admin
 */
function isAdmin(user) {
  return user && user.role === 'ADMIN';
}

/**
 * Check if user has manager role
 * @param {Object} user - Decoded JWT user object
 * @returns {boolean} True if user is manager
 */
function isManager(user) {
  return user && user.role === 'MANAGER';
}

/**
 * Check if user has data spoc role
 * @param {Object} user - Decoded JWT user object
 * @returns {boolean} True if user is data spoc
 */
function isDataSpoc(user) {
  return user && user.role === 'DATA_SPOC';
}

/**
 * Check if user has employee role
 * @param {Object} user - Decoded JWT user object
 * @returns {boolean} True if user is employee
 */
function isEmployee(user) {
  return user && user.role === 'EMPLOYEE';
}

/**
 * Require specific role(s) for route access
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {Function} Express middleware
 */
function requireRole(requiredRoles) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.'
      });
    }
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This endpoint requires one of the following roles: ${roles.join(', ')}`
      });
    }
    
    next();
  };
}

/**
 * Require admin role
 * @returns {Function} Express middleware
 */
function requireAdmin() {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Admin access required.'
      });
    }
    
    next();
  };
}

module.exports = {
  isAdmin,
  isManager,
  isDataSpoc,
  isEmployee,
  requireRole,
  requireAdmin
};
