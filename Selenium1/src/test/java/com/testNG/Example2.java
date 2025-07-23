package com.testNG;

import org.testng.annotations.Test;

public class Example2{
    @Test
    public void myMessage2() throws Exception{
        Thread.sleep(3000);
        System.out.println("How are you2");
    }

    @Test
    public void addNumbers2() throws Exception{
        Thread.sleep(3000);
        int a= 10;
        int b=20;
        int sum = a+b;

        System.out.println("The sum2: "+ sum);
    }
    @Test
    public void multiplyTwo2() throws Exception{
        Thread.sleep(3000);
        int a= 10;
        int b=20;
        int sum = a*b;

        System.out.println("The product2: "+ sum);
    }

}
