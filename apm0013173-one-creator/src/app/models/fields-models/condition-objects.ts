export class Condition {

  type: string;
}

export class LogicalFunction extends Condition {

  list: Condition[];

  constructor(value: LogicalFunction) {
    super();
    this.type = value.type;
    this.list = value.list;
  }
}

export class LogicalOperator extends Condition {

  key: string;
  value: string;

  constructor(value: LogicalOperator) {
    super();
    this.type = value.type;
    this.key = value.key;
    this.value = value.value;
  }
}
