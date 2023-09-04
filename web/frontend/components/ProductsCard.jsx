
import { useState } from "react";
import { Card, TextContainer, Text } from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";
import {shopifyApi, ApiVersion, BillingInterval } from '@shopify/shopify-api';
import metafields from "../metafield";
import createApp from "@shopify/app-bridge";
export function ProductsCard() {
  const emptyToastProps = { content: null };
  const [isLoading, setIsLoading] = useState(true);
  const [toastProps, setToastProps] = useState(emptyToastProps);
  const fetch = useAuthenticatedFetch();
  const { t } = useTranslation();
  const productsCount = 5;

  const {
    data,
    refetch: refetchProductCount,
    isLoading: isLoadingCount,
    isRefetching: isRefetchingCount,
  } = useAppQuery({
    url: "/api/products/count",
    reactQueryOptions: {
      onSuccess: () => {
        setIsLoading(false);
      },
    },
  });

  const toastMarkup = toastProps.content && !isRefetchingCount && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );
  const get_product =async (_req, res) => 
    {
        
        const products = await fetch("/api/products")
   
        
        if (products.ok) {
          const product_json=await products.json()
          
          
          return (product_json)
          
        } else 
        {
          setIsLoading(false);
          setToastProps({
            content: t("ProductsCard.errorCreatingProductsToast"),
            error: true,
          });
       }
  }

  const update_variants=async (id,price,quantity)=>
  {
      
      const variants = await fetch("/api/variants?id="+id+"&price="+price+"&quantity="+quantity)
   
        
      if (variants.ok) {
        const variants_json=await variants.json();
        const inventory_item_id=variants_json.inventory_item_id;
        let upi=update_inventory(inventory_item_id,quantity);
        return upi
      } else {
        setIsLoading(false);
        setToastProps({
          content: t("ProductsCard.errorCreatingProductsToast"),
          error: true,
        });
      }
  }
  const update_product =async (title,price,quantity,desc) => 
  {
        
      const products = await fetch("/api/products?title="+title+"&desc="+desc)
   
        
      if (products.ok) {
        const product_json=await products.json();
        const id=product_json.variants[0].id;
        const up_var= update_variants(id,price,quantity);
        return up_var
        
          
          
      } else {
        setIsLoading(false);
        setToastProps({
          content: t("ProductsCard.errorCreatingProductsToast"),
          error: true,
        });
      }
  }
  const update_inventory=async (inventory_item_id,quantity)=>
  {
      
      const inventory = await fetch("/api/inventory_levels/set?inventory_item_id="+inventory_item_id+"&quantity="+quantity);
     
          
      if (inventory.ok) {
        const inventory_json=await inventory.json();
       
        return(inventory_json);

            
      } else {
        setToastProps({
          content: t("ProductsCard.errorCreatingProductsToast"),
          error: true,
        });
      }
  }

  const handlePopulate = async () => {
    setIsLoading(true);
    var url='https://kadhem.deltasoft.corp:10048/Mobile/ODataV4/Company(%27LE%20MOTEUR%20GROS%27)/ArticlesPR?$filter=InventoryField%20gt%200&$top=10';
    var xhttp=new XMLHttpRequest();
    xhttp.open("GET", url, true);

    xhttp.setRequestHeader("Accept", "application/json");
    xhttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    xhttp.setRequestHeader("If-Match", "*");
    xhttp.setRequestHeader("Authorization", "Basic " + btoa("kadhem" + ":" + "Kadhem@2023"));

    xhttp.send();
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState === XMLHttpRequest.DONE) {
          if (xhttp.status === 200) {
              var xmlDoc = JSON.parse(xhttp.responseText);
              
              let product=get_product();
              product.then(function(result) {
                const product_shopify=result.data;
                const product_bc=xmlDoc.value;

                const product_bcByname = product_shopify.reduce((ac, record) => {
                  if (record.title) {
                    return {
                      ...ac,
                      [record.title]: record
                    }
                  }
                  return ac
                }, {});
                const objClean = product_bc.filter((item) => {
                  const isDuplicated = product_bcByname[item.No];
                  return !isDuplicated;
                });
                var i=-1;
                
                function myLoop() {         
                  setTimeout(function() {  
                      
                    i++;   
                    console.log(''+i);                 
                    if (i < objClean.length) { 
                      var title=objClean[i].No;
                      var price=objClean[i].Unit_Price;
                      var quant=objClean[i].InventoryField;
                      var desc=objClean[i].Description;
                      let product= update_product(title,price,quant,desc);
                      /*product.then(function(result) {
                        var result_test="";
                        result_test=result;
                        if (result_test!="")
                        {
                          myLoop(); 
                        }
                      });
                              */  
                      myLoop();  
                    }
                    else{
                      refetchProductCount();
                    }                       
                  }, 1000)
                }
                if (objClean.length===0)
                {
                  setIsLoading(false);
                }else
                {myLoop(); }
               
               

              });
              

          } else
              {alert(xhttp.status);setIsLoading(false);}
      }
    };

    
    /*
    let product=update_product("CLUTCH ASSY",'120','60');
    product.then(function(result) {
      console.log(result);
      refetchProductCount();
    });*/

  };

  return (
    <>
      {toastMarkup}
      <Card
        title={t("ProductsCard.title")}
        sectioned
        primaryFooterAction={{
          content: t("Add Products", {
            count: productsCount,
          }),
          onAction: handlePopulate,
          loading: isLoading,
        }}
      >
        <TextContainer spacing="loose">
          <p>{t("ProductsCard.description")}</p>
          <Text as="h4" variant="headingMd">
            {t("ProductsCard.totalProductsHeading")}
            <Text variant="bodyMd" as="p" fontWeight="semibold">
              {isLoadingCount ? "-" : data.count}
            </Text>
          </Text>
        </TextContainer>
      </Card>
    </>
  );
}
