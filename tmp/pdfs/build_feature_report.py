from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xml.sax.saxutils import escape
from pathlib import Path

OUT = Path(r'C:\Healthybite\healthybite\output\pdf\HealthyBite_Two_Week_Feature_Report_Updated.pdf')
FONT = r'C:\Windows\Fonts\arial.ttf'
BOLD = r'C:\Windows\Fonts\arialbd.ttf'
pdfmetrics.registerFont(TTFont('ArialHB', FONT))
pdfmetrics.registerFont(TTFont('ArialHB-Bold', BOLD))

forest = colors.HexColor('#164634')
forest_dark = colors.HexColor('#103a2b')
leaf = colors.HexColor('#2f8059')
mint = colors.HexColor('#eaf5eb')
pale = colors.HexColor('#f4f8f2')
ink = colors.HexColor('#23352d')
muted = colors.HexColor('#65756b')
line = colors.HexColor('#dce8dd')
cream = colors.HexColor('#fbfaf3')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitleHB', fontName='ArialHB-Bold', fontSize=26, leading=31, textColor=colors.white, spaceAfter=8))
styles.add(ParagraphStyle(name='CoverSubHB', fontName='ArialHB', fontSize=11, leading=17, textColor=colors.HexColor('#e0f1e3')))
styles.add(ParagraphStyle(name='SectionHB', fontName='ArialHB-Bold', fontSize=20, leading=25, textColor=forest_dark, spaceBefore=1, spaceAfter=10, keepWithNext=True))
styles.add(ParagraphStyle(name='SubHB', fontName='ArialHB-Bold', fontSize=12, leading=16, textColor=forest, spaceBefore=9, spaceAfter=4, keepWithNext=True))
styles.add(ParagraphStyle(name='BodyHB', fontName='ArialHB', fontSize=9.1, leading=13.2, textColor=ink, spaceAfter=5))
styles.add(ParagraphStyle(name='SmallHB', fontName='ArialHB', fontSize=8, leading=11, textColor=muted, spaceAfter=3))
styles.add(ParagraphStyle(name='BulletHB', fontName='ArialHB', fontSize=8.6, leading=12.1, textColor=ink, leftIndent=11, firstLineIndent=-7, bulletIndent=0, spaceAfter=3))
styles.add(ParagraphStyle(name='PathHB', fontName='ArialHB', fontSize=7.8, leading=10.8, textColor=forest_dark, leftIndent=10, firstLineIndent=-7, spaceAfter=2.5, wordWrap='CJK'))
styles.add(ParagraphStyle(name='TableHeadHB', fontName='ArialHB-Bold', fontSize=8, leading=10, textColor=colors.white))
styles.add(ParagraphStyle(name='TableCellHB', fontName='ArialHB', fontSize=7.7, leading=10.2, textColor=ink, wordWrap='CJK'))
styles.add(ParagraphStyle(name='CalloutHB', fontName='ArialHB-Bold', fontSize=9.2, leading=13.5, textColor=forest_dark, spaceAfter=1))
styles.add(ParagraphStyle(name='KickerHB', fontName='ArialHB-Bold', fontSize=8, leading=11, textColor=leaf, spaceAfter=5, tracking=1))

P = lambda text, style='BodyHB': Paragraph(text, styles[style])
def bullets(items, style='BulletHB'):
    return [P('&bull;&nbsp; ' + item, style) for item in items]
def paths(items):
    return [P('&bull;&nbsp; <font name="ArialHB-Bold">' + escape(path) + '</font> - ' + desc, 'PathHB') for path, desc in items]
def callout(label, text):
    box = Table([[P('<b>' + escape(label) + '</b><br/>' + text, 'CalloutHB')]], colWidths=[168*mm])
    box.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), mint), ('BOX',(0,0),(-1,-1),0.6,line),
        ('LEFTPADDING',(0,0),(-1,-1),10), ('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),8), ('BOTTOMPADDING',(0,0),(-1,-1),8),
    ]))
    return box

def section(title, summary=None):
    result = [P(title, 'SubHB')]
    if summary:
        result.append(P(summary))
    return result

def page_header(canvas, doc):
    canvas.saveState()
    w, h = A4
    if doc.page > 1:
        canvas.setFillColor(forest)
        canvas.rect(0, h-13*mm, w, 13*mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont('ArialHB-Bold', 8)
        canvas.drawString(19*mm, h-8.5*mm, 'HEALTHYBITE  /  FEATURE AND CODE GUIDE')
        canvas.setFont('ArialHB', 7.5)
        canvas.drawRightString(w-19*mm, h-8.5*mm, 'Updated 12 November 2026')
    canvas.setStrokeColor(line)
    canvas.setLineWidth(0.6)
    canvas.line(19*mm, 15*mm, w-19*mm, 15*mm)
    canvas.setFillColor(muted)
    canvas.setFont('ArialHB', 7.5)
    canvas.drawString(19*mm, 10*mm, 'HealthyBite project report - feature scope grouped by week')
    canvas.drawRightString(w-19*mm, 10*mm, str(doc.page))
    canvas.restoreState()

story = []
# Cover and update summary
cover = Table([
    [P('HealthyBite<br/>Two-Week Feature Report', 'CoverTitleHB')],
    [P('Updated project guide: features, purpose, folders, files, and reusable components', 'CoverSubHB')],
], colWidths=[168*mm])
cover.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1),forest),('BOX',(0,0),(-1,-1),0,forest),
    ('LEFTPADDING',(0,0),(-1,-1),16),('RIGHTPADDING',(0,0),(-1,-1),16),
    ('TOPPADDING',(0,0),(0,0),17),('BOTTOMPADDING',(0,0),(0,0),3),
    ('TOPPADDING',(0,1),(0,1),3),('BOTTOMPADDING',(0,1),(0,1),17),
]))
story += [Spacer(1,17*mm), cover, Spacer(1,7*mm)]
story += [P('REPORT SCOPE', 'KickerHB')]
story += [P('This report maps HealthyBite features to their purpose and the client/server files that implement them. The two-week grouping describes feature scope; repository history does not establish exact delivery dates.')]
story += [P('The interface calls food items <b>Meals</b>. The API and MongoDB schema use <b>Products</b> and <b>Catalog</b> terminology.')]
story += [P('WHAT THIS UPDATE ADDS', 'SubHB')]
story += bullets([
    'Corrects the checkout section: HealthyBite now creates orders, validates COD and Razorpay payments, supports wallet contributions, and provides payment result and retry flows.',
    'Adds order lifecycle, cancellation, return-request, wallet-refund, and admin delivery-status details.',
    'Records the current page sizes: customer orders 4, admin orders 8, and customer product listings 8 per page.',
    'Adds the recent blocked-login behavior and shared OrderStatusBadge component, and documents the refactoring of Admin Meal Management.',
    'Corrects controller paths to match the current split controller files and catalog export module.',
])
story += [Spacer(1,4*mm), callout('Important configuration', 'Razorpay and Cloudinary credentials are read from server environment variables. Secrets are not included in this report or source control.'), PageBreak()]

# Week 1
story += [P('WEEK 1  /  FOUNDATION AND CUSTOMER ACCOUNTS', 'KickerHB'), P('Application foundation and navigation', 'SectionHB')]
story += [P('The React 19/Vite client handles routes, shared UI, API calls, authentication state, and responsive presentation. The Express 5 server exposes JSON APIs, connects to MongoDB, and separates route registration from business logic and persistence.')]
story += [P('<b>Why it is useful:</b> The client and server have clear responsibilities. Shared public navigation keeps customer pages visually consistent, while server routes and controllers keep data rules in one place.')]
story += paths([
    ('client/src/App.jsx', 'declares public, customer, and admin routes, including checkout, order history, returns, and wallet.'),
    ('client/src/api/axios.js', 'central Axios client, API base URL, credentials, and common error text.'),
    ('client/src/context/AuthContext.jsx', 'loads the current session and exposes customer user state and logout.'),
    ('client/src/components/Header.jsx and Footer.jsx', 'shared public site header and footer.'),
    ('server/src/app.js', 'middleware setup and API route mounting.'),
    ('server/src/config/db.js', 'MongoDB connection.'),
])
story += section('Customer and admin authentication', 'Customers can register, verify email with OTP, sign in with password or Google, log out, and reset a forgotten password. Passwords are hashed; authentication endpoints use rate limits; protected routes distinguish customer access from admin access.')
story += [P('<b>Blocked-account behavior:</b> blocked customers are rejected by protected server APIs. The login page shows the blocked-account message only after the blocked customer submits a sign-in attempt; the automatic session check no longer stores or displays that message.')]
story += paths([
    ('client/src/pages/RegisterPage.jsx, LoginPage.jsx, OtpPage.jsx, ForgotPasswordPage.jsx, ResetPasswordPage.jsx', 'customer registration, sign-in, OTP, and password recovery screens.'),
    ('client/src/components/GuestRoute.jsx and ProtectedRoute.jsx', 'customer route gating.'),
    ('client/src/api/auth.js', 'authentication request helpers.'),
    ('server/src/routes/authRoutes.js', 'registration, login, OTP, and admin auth endpoints.'),
    ('server/src/controllers/sessionController.js', 'customer registration, verification, login, and admin login.'),
    ('server/src/controllers/googleAuthController.js and passwordController.js', 'Google sign-in and password reset/OTP flows.'),
    ('server/src/middleware/authMiddleware.js', 'session verification, role protection, and blocked-account rejection.'),
    ('server/src/middleware/rateLimiters.js, server/src/utils/token.js, server/src/models/User.js', 'rate limits, JWT cookies, password hashing, and account fields.'),
])
story += [PageBreak()]

story += [P('WEEK 1  /  PROFILES AND SUPPORT', 'KickerHB'), P('Customer profile and delivery addresses', 'SectionHB')]
story += [P('Customers can view and edit account details, change email with verification, update a password, upload a profile photo, and manage saved delivery addresses. Addresses can be added, edited, deleted, and marked as the default checkout address. Profile images use a square Cropper.js workflow and are stored in Cloudinary.')]
story += [P('<b>Why it is useful:</b> Saved contact and delivery details reduce repeated entry at checkout and keep order delivery information together with the account.')]
story += paths([
    ('client/src/pages/AccountPage.jsx, ProfilePage.jsx, AddressFormPage.jsx', 'account links, profile editing, and address forms.'),
    ('client/src/components/QuantityStepper.jsx', 'shared accessible quantity controls used where item quantities need adjustment.'),
    ('server/src/routes/profileRoutes.js and addressRoutes.js', 'protected profile and address endpoints.'),
    ('server/src/controllers/profileController.js and addressController.js', 'profile image/email/profile updates and address CRUD/default selection.'),
    ('server/src/models/Address.js and User.js', 'saved address and customer records.'),
    ('server/src/config/cloudinary.js and server/scripts/migrateProfilePhotosToCloudinary.js', 'Cloudinary storage and migration of existing profile photos.'),
])
story += section('Admin customer support', 'Admins can search and paginate customer accounts, view customer details, and block or reactivate an account. The backend enforces the block on protected customer requests.')
story += paths([
    ('client/src/pages/AdminUsersPage.jsx and AdminCustomerPage.jsx', 'customer directory and customer detail screens.'),
    ('client/src/components/admin/customers/AdminCustomerTable.jsx and AdminCustomerStats.jsx', 'reusable customer table and summary cards.'),
    ('server/src/controllers/adminCustomerController.js', 'admin search, pagination, profile details, and block state updates.'),
    ('server/src/models/User.js and server/src/middleware/authMiddleware.js', 'persisted block state and server-side enforcement.'),
])
story += [callout('Access rule', 'A blocked account cannot use protected customer features. A blocked-account warning belongs to the sign-in attempt, not to an unrelated page load.'), PageBreak()]

# Week 2 catalog
story += [P('WEEK 2  /  MEALS AND CUSTOMER DISCOVERY', 'KickerHB'), P('Admin category and meal management', 'SectionHB')]
story += [P('Admins can create, edit, search, activate/deactivate, and soft-delete categories. Meal management covers name, description, category, price/offer, stock, highlights, nutrition, publication status, and home-page featuring. Meals can be activated or deactivated from the list; product creation/editing uses the dedicated editor.')]
story += [P('The meal editor accepts 1-5 images. Cropper.js presents a square crop on each image, creates a 1200 x 1200 WebP image, and sends it to Cloudinary. The editor logic is split into image hooks and focused UI components so the page does not repeat the full cropper and form code.')]
story += [P('<b>Why it is useful:</b> Admins control what is available to customers and can keep meal imagery, stock, and publication state consistent. Soft deletion preserves records while removing them from public discovery.')]
story += paths([
    ('client/src/pages/AdminMealsPage.jsx', 'meal/category tabs, search and filters, availability actions, pagination, and category edit.'),
    ('client/src/pages/AdminMealEditorPage.jsx', 'dedicated meal create/edit form.'),
    ('client/src/hooks/useMealImages.js', 'image queue, preview lifecycle, Cropper.js initialization, crop, cancel, and remove functions.'),
    ('client/src/components/admin/meals/MealBasicInformation.jsx, MealNutritionFields.jsx, MealPublishingControls.jsx, MealVisuals.jsx, MealCropDialog.jsx', 'focused editor sections and crop dialog.'),
    ('client/src/components/admin/meals/CategoryEditorModal.jsx', 'reusable category editor dialog extracted from the large management page.'),
    ('server/src/controllers/categoryController.js and productController.js', 'category/product validation, search, availability, stats, and CRUD handlers.'),
    ('server/src/controllers/catalogController.js', 'barrel exports category, product, cart, and wishlist controller handlers for route wiring.'),
    ('server/src/middleware/productUpload.js, server/src/models/Product.js, server/src/config/cloudinary.js', 'image input validation, product schema, Cloudinary upload and cleanup.'),
    ('server/scripts/migrateProductImagesToCloudinary.js', 'migration of existing product image references.'),
])
story += section('Customer meal listing and detail', 'The /products page combines backend search, category, dietary, price range, sorting, and pagination. Product detail shows gallery, zoom, breadcrumbs, offer/current price, stock, highlights, and related meals. Zero-stock products remain visible with an out-of-stock treatment; purchase actions are blocked when stock is unavailable.')
story += paths([
    ('client/src/pages/CatalogPage.jsx', 'search/filter/sort query state and product listing pagination.'),
    ('client/src/components/ProductCard.jsx', 'reusable meal card with availability, offer, wishlist, and add-to-cart actions.'),
    ('client/src/pages/ProductPage.jsx', 'product detail and unavailable-product handling.'),
    ('server/src/controllers/productController.js - listProducts/getProduct', 'authoritative public listing filters, sorting, pagination, product detail, and related meals.'),
])
story += [PageBreak()]

# Cart and checkout
story += [P('WEEK 2  /  CART, WISHLIST, CHECKOUT', 'KickerHB'), P('Cart and wishlist', 'SectionHB')]
story += [P('Customers can add/remove meals, adjust quantities, see line totals and the cart total, and save/remove wishlist meals. Adding a meal to the cart removes it from the wishlist. The backend validates product availability and stock rather than trusting client cart values.')]
story += [P('<b>Why it is useful:</b> Shared item controls keep quantity changes consistent while server-side checks prevent stale or unavailable cart data from becoming an order.')]
story += paths([
    ('client/src/pages/CartPage.jsx and WishlistPage.jsx', 'cart and saved-meal experiences.'),
    ('client/src/components/QuantityStepper.jsx', 'one quantity stepper reused by cart, wishlist, and return quantity selection.'),
    ('client/src/utils/cart.js', 'shared cart helpers and cart-count synchronization.'),
    ('server/src/controllers/cartController.js and wishlistController.js', 'cart stock checks, line updates, cart-to-wishlist cleanup, and wishlist actions.'),
    ('server/src/models/Cart.js and Wishlist.js', 'persisted customer cart and wishlist.'),
])
story += section('Checkout and payments', 'Checkout displays saved addresses with edit/add options, ordered items and quantities, verified item totals, shipping/tax/discount, and final payable amount. Coupons have server-side validation and usage limits. Payment choices include Cash on Delivery, Razorpay, and a wallet contribution. Wallet funds can be combined with COD for the remaining due amount.')
story += [P('Razorpay orders are created on the server and payment results are verified by the backend. Success/failure screens report the result; failed online payment can be retried against the order without creating a duplicate order. COD revenue is treated as collected after delivery.')]
story += paths([
    ('client/src/pages/CheckoutPage.jsx', 'address selection, order summary, coupon, wallet amount, and payment selection.'),
    ('client/src/pages/PaymentResultPage.jsx', 'payment success/failure result and retry route.'),
    ('server/src/controllers/orderController.js - quoteCheckout/placeOrder/verifyPayment/retryPayment', 'authoritative price/stock checks, order creation, Razorpay verification, and retry.'),
    ('server/src/utils/orderPricing.js', 'subtotal, shipping, tax, discount, wallet contribution, and total calculation.'),
    ('server/src/models/Order.js and Coupon.js', 'order/payment snapshots and coupon usage constraints.'),
    ('server/src/controllers/adminCouponController.js and server/src/routes/adminCouponRoutes.js', 'admin coupon management and usage configuration.'),
])
story += [callout('Payment credentials', 'Razorpay Key ID and Key Secret belong in the server environment. Never copy secret values into the report, client bundle, or source control.'), PageBreak()]

# Orders/wallet/returns
story += [P('WEEK 2  /  ORDERS, WALLET, RETURNS', 'KickerHB'), P('Order history and delivery lifecycle', 'SectionHB')]
story += [P('Customers can review orders, open order details, see item/payment summaries, and follow the delivery progress. Order status advances from Order Placed to Out for Delivery to Delivered through admin actions. Customers can cancel only while the order is still Order Placed; cancellation is unavailable after it moves Out for Delivery.')]
story += [P('Customer order history is paginated at 4 orders per page. Admin orders are paginated at 8 per page. Customer product listing is paginated at 8 per page. These limits are applied on the relevant endpoints/pages; they do not change unrelated lists.')]
story += paths([
    ('client/src/pages/OrdersPage.jsx and OrderDetailPage.jsx', 'customer order history, pagination, delivery progress, details, cancellation, and return entry point.'),
    ('client/src/components/OrderDeliveryProgress.jsx', 'shared three-step delivery timeline with timestamps.'),
    ('client/src/components/OrderStatusBadge.jsx', 'shared order status text and badge styles for customer history, order detail, and admin order views.'),
    ('server/src/controllers/orderController.js - getMyOrders/getMyOrder/cancelOrder', 'customer order queries and order cancellation; history is capped at 4 per page.'),
    ('server/src/controllers/adminOrderController.js - listAdminOrders/markOrderOutForDelivery/markOrderDelivered', 'admin order list and delivery progression; list is capped at 8 per page.'),
    ('server/src/models/Order.js', 'order line snapshots, pricing, payment, status timestamps, return details, and idempotency key.'),
])
story += section('Wallet and return requests', 'The wallet page displays the customer balance and ledger. When the admin accepts an eligible return request, the approved refund is credited to the wallet. Customers can request a return only after delivery, select products and quantities, provide a reason, and cancel a pending request. The admin reviews and accepts requests. The accepted-return Payment label in the admin list reads "Refunded to Wallet".')
story += paths([
    ('client/src/pages/WalletPage.jsx', 'wallet balance and transaction history.'),
    ('client/src/pages/ReturnRequestPage.jsx', 'return item/quantity/reason form.'),
    ('server/src/controllers/walletController.js and server/src/utils/wallet.js', 'wallet read operations, credits, debits, and ledger handling.'),
    ('server/src/controllers/orderController.js - requestReturn/cancelReturnRequest', 'customer return eligibility and request state.'),
    ('server/src/controllers/adminOrderController.js - acceptReturnRequest', 'admin acceptance and wallet refund.'),
    ('server/src/models/Wallet.js and Order.js', 'wallet ledger and return request/refund state.'),
])
story += [PageBreak()]

# Admin
story += [P('WEEK 2  /  ADMIN OPERATIONS', 'KickerHB'), P('Overview, reports, coupons, and customer operations', 'SectionHB')]
story += [P('The admin overview summarizes sales and operations. Reports show revenue/orders trends, order-status distribution, top-selling meals, sales by category, and coupon performance. Admins can manage coupon values and usage limits. Customer management supports search, paging, customer detail, and account block/reactivation.')]
story += [P('<b>Collected revenue:</b> online and wallet payments count when paid; Cash on Delivery counts after delivery. Return acceptance and refunds are tracked through the order and wallet records.')]
story += paths([
    ('client/src/pages/AdminOverviewPage.jsx and AdminReportsPage.jsx', 'overview metrics, sales/revenue visualizations, top meals, category and coupon reports.'),
    ('client/src/pages/AdminOrdersPage.jsx', 'admin order search/status filter, 8-item pagination, order detail, delivery actions, return acceptance, and refund display.'),
    ('client/src/pages/AdminCouponsPage.jsx', 'coupon create/edit/list and usage limit display.'),
    ('client/src/components/admin/customers/AdminCustomerTable.jsx and AdminCustomerStats.jsx', 'customer list and reusable summary/table components.'),
    ('server/src/controllers/adminOrderController.js - getAdminOrderReports', 'server-side order/revenue summaries for reporting.'),
    ('server/src/controllers/adminCouponController.js', 'coupon CRUD and usage-limit rules.'),
    ('server/src/controllers/adminCustomerController.js', 'customer search, pagination, details, and account-state changes.'),
])
story += section('Home and About pages', 'The home page displays featured meals sourced from the existing catalog and category links. Admin meal editing includes the home-page featured toggle. The About page presents HealthyBite information and is linked from public navigation.')
story += paths([
    ('client/src/pages/HomePage.jsx', 'home hero, category navigation, and featured meal section.'),
    ('client/src/pages/AboutPage.jsx and client/src/styles/About.css', 'customer-facing About screen and styling.'),
    ('client/src/components/Header.jsx', 'public navigation to Home, Explore Meals, About, cart, wishlist, and account.'),
    ('client/src/pages/AdminMealEditorPage.jsx and client/src/components/admin/meals/MealPublishingControls.jsx', 'admin control for publication and home featuring.'),
])
story += [PageBreak()]

# Structure, reuse and pagination matrix
story += [P('PROJECT MAP  /  WHERE TO EDIT', 'KickerHB'), P('Client and server folder responsibilities', 'SectionHB')]
rows = [
    [P('Folder', 'TableHeadHB'), P('Responsibility', 'TableHeadHB')],
    [P('<b>client/src/pages</b>', 'TableCellHB'), P('Route-level screens and page state: account, catalog, checkout, orders, admin screens.', 'TableCellHB')],
    [P('<b>client/src/components</b>', 'TableCellHB'), P('Reusable layout and UI: headers, auth fields, product cards, confirmation dialogs, quantity controls, pagination, order status.', 'TableCellHB')],
    [P('<b>client/src/components/admin</b>', 'TableCellHB'), P('Admin feature components grouped by area, including meals and customers.', 'TableCellHB')],
    [P('<b>client/src/hooks</b>', 'TableCellHB'), P('Reusable stateful UI logic, including meal-image crop/upload queue.', 'TableCellHB')],
    [P('<b>client/src/api, context, utils, styles</b>', 'TableCellHB'), P('API access, auth state, common helpers, and feature styling.', 'TableCellHB')],
    [P('<b>server/src/routes</b>', 'TableCellHB'), P('HTTP route registration and auth/role middleware placement.', 'TableCellHB')],
    [P('<b>server/src/controllers</b>', 'TableCellHB'), P('Request validation, business rules, persistence coordination, and responses.', 'TableCellHB')],
    [P('<b>server/src/models</b>', 'TableCellHB'), P('Mongoose schemas and persisted domain records.', 'TableCellHB')],
    [P('<b>server/src/middleware, config, utils</b>', 'TableCellHB'), P('Authentication/uploads/validation, database and Cloudinary setup, shared pricing/pagination/token helpers.', 'TableCellHB')],
]
t = Table(rows, colWidths=[47*mm, 121*mm], repeatRows=1)
t.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),forest),('GRID',(0,0),(-1,-1),0.45,line),
    ('BACKGROUND',(0,1),(-1,-1),colors.white),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,pale]),
    ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
    ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
]))
story += [t, Spacer(1,4*mm), P('Reusable components and their use', 'SubHB')]
story += bullets([
    '<b>AdminPageLayout</b> - shared admin sidebar, toolbar, and logout flow across overview, meals, orders, customers, coupons, and reports.',
    '<b>AdminPageHeader</b> and <b>AdminPagination</b> - consistent admin headings and list navigation. AdminPagination is also used on customer order history.',
    '<b>ActionConfirmation</b> - shared confirmation UI for product/cart/order actions, with reusable danger styling.',
    '<b>QuantityStepper</b> - one quantity control reused by cart, wishlist, and return request forms.',
    '<b>OrderStatusBadge</b> - same order label/status mapping in customer list/detail and admin list/detail.',
    '<b>AdminCustomerTable</b> and meal editor subcomponents - domain UI kept outside large route pages.',
])
story += [P('Current pagination sizes', 'SubHB')]
pag_rows = [
    [P('Screen / endpoint', 'TableHeadHB'), P('Items per page', 'TableHeadHB'), P('Implementation', 'TableHeadHB')],
    [P('Customer orders - /orders', 'TableCellHB'), P('4', 'TableCellHB'), P('OrdersPage.jsx requests limit=4; getMyOrders caps limit at 4.', 'TableCellHB')],
    [P('Admin orders - /admin/orders', 'TableCellHB'), P('8', 'TableCellHB'), P('AdminOrdersPage.jsx and listAdminOrders cap at 8.', 'TableCellHB')],
    [P('Customer meals - /products', 'TableCellHB'), P('8', 'TableCellHB'), P('CatalogPage.jsx requests 8; listProducts defaults/caps at 8.', 'TableCellHB')],
    [P('Admin meals', 'TableCellHB'), P('8 in the UI', 'TableCellHB'), P('AdminMealsPage.jsx requests eight meals per page.', 'TableCellHB')],
]
t2 = Table(pag_rows, colWidths=[48*mm,28*mm,92*mm], repeatRows=1)
t2.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),forest),('GRID',(0,0),(-1,-1),0.45,line),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,pale]),('VALIGN',(0,0),(-1,-1),'TOP'),
    ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
    ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
]))
story += [t2, Spacer(1,4*mm), callout('How a feature request flows', 'Customer/admin page -> shared API client -> route + middleware -> controller -> model and utilities -> MongoDB/Cloudinary/payment provider. The UI presents the result; the server remains authoritative for access, availability, pricing, stock, payment, and refunds.')]
story += [Spacer(1,1*mm), P('Run requirements', 'SmallHB'), P('Client: run npm install and npm run dev from client/. Server: set environment variables and connect MongoDB, then run npm install and npm run dev from server/. Razorpay and Cloudinary credentials belong on the server.', 'SmallHB')]


doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    rightMargin=21*mm, leftMargin=21*mm,
    topMargin=21*mm, bottomMargin=21*mm,
    title='HealthyBite Two-Week Feature Report - Updated',
    author='HealthyBite Project Documentation',
    subject='Feature purpose, architecture, file map, and reusable components',
)
doc.build(story, onFirstPage=page_header, onLaterPages=page_header)
print(str(OUT))

