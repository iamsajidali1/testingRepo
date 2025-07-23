package com.testNG;

import org.testng.annotations.Test;

public class Example1 {

    @Test              //(groups = {"Regression"}), (priority = 1) ,(enabled = false)
    public void myMessage() throws Exception{
        Thread.sleep(3000);
        System.out.println("How are you");
    }
    @Test        // (groups = {"Regression","Sanity"}) , (timeOut = 4000) ,(invocationCount = 5)
    public void addNumbers() throws Exception{
        int a= 10;
        int b=20;
        int sum = a+b;
        Thread.sleep(3000);
        System.out.println("The sum: "+ sum);
    }
    @Test                   //(priority = 1)
    public void multiplyTwo() throws  Exception{
        int a= 10;
        int b=20;
        Thread.sleep(3000);
        int sum = a*b;

        System.out.println("The product: "+ sum);
    }

}
