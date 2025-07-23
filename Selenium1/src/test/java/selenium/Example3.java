package selenium;

import org.testng.annotations.Test;

public class Example3 {
    @Test
    public void myMessage3() throws Exception{
        Thread.sleep(3000);
        System.out.println("How are you3");
    }

    @Test
    public void addNumbers3() throws Exception{
        Thread.sleep(3000);
        int a= 10;
        int b=20;
        int sum = a+b;

        System.out.println("The sum3: "+ sum);
    }
    @Test
    public void multiplyTwo3() throws Exception{
        Thread.sleep(3000);
        int a= 10;
        int b=20;
        int sum = a*b;

        System.out.println("The product: "+ sum);
    }

}
