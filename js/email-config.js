/**
 * EmailJS Configuration for OmRestaurant
 */
window.EMAILJS_CONFIG = {
    // Default credentials
    publicKey: "oMUTFQVOur_fOnw_t",
    serviceId: "service_da1y4nn",

    // Form-specific configurations
    forms: {
        // Newsletter Subscription
        newsletter: {
            publicKey: "oMUTFQVOur_fOnw_t",
            serviceId: "service_da1y4nn",
            templateId: "template_0by6ed7"
        },
        // Table Booking
        booking: {
            publicKey: "oMUTFQVOur_fOnw_t",
            serviceId: "service_da1y4nn",
            templateId: "template_7uffzct"
        },
        // Contact Us
        contact: {
            publicKey: "OVv3HY-kOjQfzS0GV",
            serviceId: "service_lf56m2o",
            templateId: "template_e6tjmba"
        }
    },

    // Legacy templates mapping
    templates: {
        newsletter: "template_0by6ed7",
        booking: "template_7uffzct",
        contact: "template_e6tjmba"
    }
};
