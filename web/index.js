// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";

const CREATE_CODE_MUTATION = `
  mutation CreateCodeproduct($product: productCodeAppInput!) {
    productCreate: productCodeAppCreate(codeAppproduct: $product) {
      userErrors {
        code
        message
        field
      }
    }
  }
`;
const PORT = parseInt(
    process.env.BACKEND_PORT || process.env.PORT || "3000",
    10
);

const STATIC_PATH =
    process.env.NODE_ENV === "production" ?
    `${process.cwd()}/frontend/dist` :
    `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
    shopify.config.auth.callbackPath,
    shopify.auth.callback(),
    shopify.redirectToShopifyOrAppRoot()
);
app.post(
    shopify.config.webhooks.path,
    shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

// `session` is built as part of the OAuth process
const create_product = async(_req, res, mutation) => {
    {

        const session = new shopify.api.clients.Rest({ session: res.locals.shopify.session, });
        const client = new shopify.api.clients.Graphql(session);
        const data = await client.query({
            data: {
                query: mutation,
                variables: _req.body
            }
        });


        res.send(data.body);

    }
}
app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());
app.get("/api/inventory_levels/set", async(_req, res) => {
    const inventory_level = new shopify.api.rest.InventoryLevel({ session: res.locals.shopify.session });
    const inventory = _req.query.inventory_item_id;
    const abailabless = _req.query.quantity;
    inventory_level.location_id = 90593001789;
    inventory_level.inventory_item_id = Number(inventory);
    inventory_level.available = Number(abailabless);
    await inventory_level.set({
        location_id: 90593001789,
        inventory_item_id: Number(inventory),
        available: Number(abailabless)
    });
    res.status(200).send(inventory_level);

});
app.get("/api/variants", async(_req, res) => {
    const variants = new shopify.api.rest.Variant({ session: res.locals.shopify.session });
    const id = _req.query.id;
    const price = _req.query.price;
    variants.id = Number(id);
    variants.price = price + '';
    variants.barcode = '';
    variants.inventory_management = 'shopify';
    //variants.compare_at_price = '120';


    await variants.save({
        update: true,
    });
    res.status(200).send(variants);

});
app.get("/api/products", async(_req, res) => {
    const products = new shopify.api.rest.Product({ session: res.locals.shopify.session });
    //const user = _req.params.user;
    // var offset = _req.query.offset;
    const title = _req.query.title;
    const desc = _req.query.desc;

    if (title) {
        products.title = '' + title;
        products.vendor = 'Quickstart (3b0be568)';
        products.status = 'active';
        products.handle = '' + title;
        products.published_scope = 'global';
        products.body_html = '' + desc;
        products.template_suffix = '';


        await products.save({
            update: true,
        });
        res.status(200).send(products);
    } else {
        try {
            const response = await shopify.api.rest.Product.all({
                session: res.locals.shopify.session
            });
            res.status(200).send(response);
        } catch (err) {

            res.status(500).send(err);

        }
    }



});



app.get("/api/products/count", async(_req, res) => {
    const countData = await shopify.api.rest.Product.count({
        session: res.locals.shopify.session,
    });
    res.status(200).send(countData);
});

/*app.get("/api/products/create", async(_req, res) => {
    //const product = new shopify.api.rest.Product({ session: res.locals.shopify.session });

    let status = 200;
    let error = null;
    try {
        const session = res.locals.shopify.session;
        const client = new shopify.api.clients.Graphql({ session });
        await client.query({
            data: `mutation{
        productCreate(input:{title:${_req.body.title},body_html : null,vendor:"Quickstart (3b0be568)",product_type:"",status:"active"}){
          product{
            id
          }
        }
      }
      `
        });
    } catch (err) {
        console.log(`failed to process request ${err}`);
        status = 500;
        error = err.message
    }
    res.status(status).send({ success: status === 200, error });

});*/

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async(_req, res, _next) => {
    return res
        .status(200)
        .set("Content-Type", "text/html")
        .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);